using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinancialCopilot.Infrastructure.Migrations
{
    public partial class AddSubscriptions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Plan fields on Users
            migrationBuilder.Sql(@"
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Plan"" text NOT NULL DEFAULT 'free';
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PlanExpiresAt"" timestamp with time zone;
            ");

            // Subscriptions table
            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Plan = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    BillingCycle = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AmountPaid = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PaymentReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PaymentGatewayId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Subscriptions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(name: "IX_Subscriptions_UserId", table: "Subscriptions", column: "UserId");
            migrationBuilder.CreateIndex(name: "IX_Subscriptions_PaymentReference", table: "Subscriptions", column: "PaymentReference", unique: true, filter: "\"PaymentReference\" IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Subscriptions");
            migrationBuilder.DropColumn(name: "Plan", table: "Users");
            migrationBuilder.DropColumn(name: "PlanExpiresAt", table: "Users");
        }
    }
}
