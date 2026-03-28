using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Application.Services;
using FinancialCopilot.Infrastructure.Data;
using FinancialCopilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using System.Text;
using System.Threading.RateLimiting;
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Memory Cache para optimización
builder.Services.AddMemoryCache();

// Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IApplicationDbContext>(provider => 
    provider.GetRequiredService<ApplicationDbContext>());

// Services
builder.Services.AddScoped<IAnalysisService, AnalysisService>();
builder.Services.AddScoped<IFinancialInsightsService, FinancialInsightsService>();
builder.Services.AddHttpClient<IAiService, AiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(25);
});
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGamificationService, GamificationService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] 
    ?? throw new InvalidOperationException("JWT Key must be configured. Set Jwt:Key in appsettings.json or environment variables.");
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // En producción, HTTPS es obligatorio
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "FinancialCopilot",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "FinancialCopilotUsers",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("AdminOrSupport", policy => policy.RequireRole("admin", "support"));
});

// CORS - Configuración dinámica según entorno
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" }; // Fallback para desarrollo

builder.Services.AddCors(options =>
{
    options.AddPolicy("AppCorsPolicy", policy =>
    {
        // En producción, permitir dominios de Vercel (incluyendo previews)
        if (!builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin =>
            {
                // Permitir localhost para desarrollo
                if (origin.StartsWith("http://localhost")) return true;
                
                // Permitir dominios configurados
                if (allowedOrigins.Any(allowed => origin.Equals(allowed, StringComparison.OrdinalIgnoreCase)))
                    return true;
                
                // Permitir todos los subdominios de vercel.app
                if (origin.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
                    return true;
                
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
        else
        {
            // En desarrollo, permitir orígenes específicos
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Rate Limiting - Protección contra ataques
builder.Services.AddRateLimiter(options =>
{
    // Límite global: 100 requests por minuto por usuario/IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var userId = context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: userId,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 10
            });
    });

    // Respuesta cuando se excede el límite
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        context.HttpContext.Response.ContentType = "application/json";
        
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests",
            message = "Rate limit exceeded. Please try again later.",
            retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter) 
                ? retryAfter.TotalSeconds 
                : 60
        }, cancellationToken);
    };
});

var app = builder.Build();

// Aplicar migraciones automáticamente
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        Console.WriteLine($"🔍 ConnectionString configured: {!string.IsNullOrEmpty(connectionString)}");

        if (string.IsNullOrEmpty(connectionString))
        {
            Console.WriteLine("❌ ERROR: ConnectionString is null or empty!");
            throw new InvalidOperationException("ConnectionString is not configured");
        }
        
        // Verificar si hay migraciones pendientes
        var pendingMigrations = db.Database.GetPendingMigrations().ToList();
        if (pendingMigrations.Any())
        {
            Console.WriteLine($"📊 Applying {pendingMigrations.Count} pending migrations...");
            foreach (var migration in pendingMigrations)
            {
                Console.WriteLine($"  - {migration}");
            }
            db.Database.Migrate();
            Console.WriteLine("✓ Database migrations applied successfully");
        }
        else
        {
            Console.WriteLine("✓ Database is up to date, no migrations needed");
        }

        // Aplicar migraciones adicionales (gamificación, fix Tags)
        await ApplyCustomMigrationsAsync(db);

        // Bootstrap admin — solo si ADMIN_EMAIL y ADMIN_PASSWORD están en env vars
        // Una vez creado el admin, quitar esas variables de Render para mayor seguridad
        await BootstrapAdminAsync(db, builder.Configuration);
    }
    catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "42701")
    {
        // 42701 = duplicate_column error
        Console.WriteLine($"⚠ Warning: Column already exists (this is OK): {pgEx.MessageText}");
        Console.WriteLine("✓ Continuing with existing schema");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠ Warning: Could not apply migrations: {ex.Message}");
        Console.WriteLine($"⚠ Exception type: {ex.GetType().Name}");
        // En producción, las migraciones son críticas solo si no es un error de columna duplicada
        if (!app.Environment.IsDevelopment())
        {
            Console.WriteLine("❌ CRITICAL: Database migrations failed in production");
            throw;
        }
    }
}

// Configure pipeline
// CORS debe ir primero
app.UseCors("AppCorsPolicy");

// HTTPS Redirect - Solo en producción
if (!app.Environment.IsDevelopment())
{
    app.UseHsts(); // HTTP Strict Transport Security
    app.UseHttpsRedirection();
}

// Global exception handler
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled exception occurred");
        
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        
        // En producción, no exponer detalles del error
        object errorResponse = app.Environment.IsDevelopment()
            ? new 
            { 
                error = ex.Message,
                type = ex.GetType().Name,
                stackTrace = ex.StackTrace,
                innerError = ex.InnerException?.Message
            }
            : new 
            { 
                error = "An error occurred processing your request",
                message = "Please try again later or contact support if the problem persists"
            };
        
        await context.Response.WriteAsJsonAsync(errorResponse);
    }
});

// Swagger - Solo en desarrollo
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Financial Copilot API V1");
        c.RoutePrefix = "swagger";
    });
    
    Console.WriteLine("🔧 Development Mode");
    Console.WriteLine($"📚 Swagger UI: http://localhost:5000/swagger");
}
else
{
    Console.WriteLine("🚀 Production Mode");
    Console.WriteLine("✅ HTTPS Redirect: Enabled");
    Console.WriteLine("✅ Rate Limiting: Enabled");
    Console.WriteLine("✅ Swagger: Disabled");
}

// Rate Limiting
app.UseRateLimiter();

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Map Controllers
app.MapControllers();

// Health Check Endpoint
app.MapGet("/health", () => Results.Ok(new 
{ 
    status = "healthy",
    timestamp = DateTime.UtcNow,
    environment = app.Environment.EnvironmentName
})).AllowAnonymous();

Console.WriteLine($"🌐 CORS Origins: {string.Join(", ", allowedOrigins)}");
Console.WriteLine($"🔐 JWT Issuer: {builder.Configuration["Jwt:Issuer"] ?? "FinancialCopilot"}");
Console.WriteLine("✅ Application started successfully");

app.Run();

// Migraciones SQL personalizadas (gamificación, fix de columnas)
static async Task ApplyCustomMigrationsAsync(ApplicationDbContext db)
{
    try
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        using var cmd = conn.CreateCommand();

        // Fix: Tags de text a text[]
        cmd.CommandText = @"
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'Expenses' AND column_name = 'Tags' AND data_type = 'text'
                ) THEN
                    ALTER TABLE ""Expenses""
                    ALTER COLUMN ""Tags"" TYPE text[]
                    USING CASE WHEN ""Tags"" IS NULL OR ""Tags"" = '' THEN ARRAY[]::text[] ELSE ARRAY[""Tags""] END;
                    RAISE NOTICE 'Tags migrado a text[]';
                END IF;
            END $$;";
        await cmd.ExecuteNonQueryAsync();

        // Gamificación: user_progress
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS user_progress (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                points INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                current_streak INTEGER NOT NULL DEFAULT 0,
                longest_streak INTEGER NOT NULL DEFAULT 0,
                last_activity_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                total_logins INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            );";
        await cmd.ExecuteNonQueryAsync();

        // Gamificación: achievements
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS achievements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                type VARCHAR(100) NOT NULL,
                points_earned INTEGER NOT NULL DEFAULT 0,
                description TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );";
        await cmd.ExecuteNonQueryAsync();

        // Índices
        cmd.CommandText = @"
            CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
            CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);";
        await cmd.ExecuteNonQueryAsync();

        Console.WriteLine("✓ Custom migrations applied (gamification + Tags fix)");

        // Migración: Subscriptions
        cmd.CommandText = @"
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Plan"" text NOT NULL DEFAULT 'free';
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PlanExpiresAt"" timestamp with time zone;
            CREATE TABLE IF NOT EXISTS ""Subscriptions"" (
                ""Id"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""Plan"" character varying(20) NOT NULL DEFAULT 'pro',
                ""Status"" character varying(20) NOT NULL DEFAULT 'active',
                ""BillingCycle"" character varying(20) NOT NULL DEFAULT 'monthly',
                ""AmountPaid"" numeric(18,2) NOT NULL DEFAULT 0,
                ""Currency"" character varying(10) NOT NULL DEFAULT 'COP',
                ""PaymentReference"" character varying(200),
                ""PaymentGatewayId"" character varying(200),
                ""PaymentMethod"" character varying(50),
                ""StartedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                ""ExpiresAt"" timestamp with time zone NOT NULL DEFAULT now() + interval '1 month',
                ""CancelledAt"" timestamp with time zone,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                CONSTRAINT ""PK_Subscriptions"" PRIMARY KEY (""Id""),
                CONSTRAINT ""FK_Subscriptions_Users_UserId"" FOREIGN KEY (""UserId"")
                    REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS ""IX_Subscriptions_UserId"" ON ""Subscriptions""(""UserId"");
        ";
        await cmd.ExecuteNonQueryAsync();
        Console.WriteLine("✓ Subscriptions migration applied");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠ Custom migrations warning: {ex.Message}");
    }
}

// Bootstrap admin seguro — lee ADMIN_EMAIL + ADMIN_PASSWORD de env vars
// Después de crear el admin, elimina esas variables en Render y nunca más se ejecuta
static async Task BootstrapAdminAsync(ApplicationDbContext db, IConfiguration config)
{
    try
    {
        var adminEmail = config["AdminBootstrap:Email"];
        var adminPassword = config["AdminBootstrap:Password"];

        if (string.IsNullOrEmpty(adminEmail) || string.IsNullOrEmpty(adminPassword))
            return;

        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        if (existing != null)
        {
            // Siempre actualizar: rol, contraseña y desbloquear
            existing.Role = "admin";
            existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword, 12);
            existing.LockedUntil = null;
            existing.FailedLoginAttempts = 0;
            existing.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            Console.WriteLine($"✅ Admin actualizado: {adminEmail} (contraseña y rol sincronizados)");
        }
        else
        {
            var admin = new FinancialCopilot.Domain.Entities.User
            {
                Id = Guid.NewGuid(),
                Name = "Admin",
                Email = adminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword, 12),
                Role = "admin",
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();
            Console.WriteLine($"✅ Admin creado: {adminEmail}");
        }

        Console.WriteLine("⚠️  IMPORTANTE: Elimina AdminBootstrap__Email y AdminBootstrap__Password de Render después de hacer login.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠ Bootstrap admin warning: {ex.Message}");
    }
}
