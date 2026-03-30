using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinancialCopilot.Infrastructure.Migrations
{
    public partial class AddBudgets : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Budgets"" (
                    ""Id"" uuid NOT NULL,
                    ""UserId"" uuid NOT NULL,
                    ""Category"" character varying(100) NOT NULL,
                    ""LimitAmount"" numeric(18,2) NOT NULL,
                    ""Month"" integer NOT NULL,
                    ""Year"" integer NOT NULL,
                    ""AlertAt80"" boolean NOT NULL DEFAULT true,
                    ""AlertAt100"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp with time zone,
                    CONSTRAINT ""PK_Budgets"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_Budgets_Users_UserId"" FOREIGN KEY (""UserId"")
                        REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Budgets_UserId_Category_Month_Year""
                    ON ""Budgets""(""UserId"", ""Category"", ""Month"", ""Year"");
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""Budgets"";");
        }
    }
}
