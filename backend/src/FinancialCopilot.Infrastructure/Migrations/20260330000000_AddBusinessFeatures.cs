using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinancialCopilot.Infrastructure.Migrations
{
    public partial class AddBusinessFeatures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Accounts"" (
                    ""Id"" uuid NOT NULL,
                    ""OwnerId"" uuid NOT NULL,
                    ""Name"" character varying(100) NOT NULL,
                    ""Type"" character varying(30) NOT NULL DEFAULT 'personal',
                    ""Description"" text,
                    ""Currency"" character varying(10) NOT NULL DEFAULT 'COP',
                    ""Color"" character varying(20) NOT NULL DEFAULT '#10b981',
                    ""Icon"" character varying(10) NOT NULL DEFAULT '💼',
                    ""IsDefault"" boolean NOT NULL DEFAULT false,
                    ""IsArchived"" boolean NOT NULL DEFAULT false,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp with time zone,
                    CONSTRAINT ""PK_Accounts"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_Accounts_Users_OwnerId"" FOREIGN KEY (""OwnerId"")
                        REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS ""IX_Accounts_OwnerId"" ON ""Accounts""(""OwnerId"");

                CREATE TABLE IF NOT EXISTS ""TeamMembers"" (
                    ""Id"" uuid NOT NULL,
                    ""AccountId"" uuid NOT NULL,
                    ""UserId"" uuid NOT NULL,
                    ""Role"" character varying(20) NOT NULL DEFAULT 'viewer',
                    ""Status"" character varying(20) NOT NULL DEFAULT 'pending',
                    ""InviteEmail"" character varying(200),
                    ""InviteToken"" character varying(200),
                    ""InvitedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""AcceptedAt"" timestamp with time zone,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    CONSTRAINT ""PK_TeamMembers"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_TeamMembers_Accounts_AccountId"" FOREIGN KEY (""AccountId"")
                        REFERENCES ""Accounts"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_TeamMembers_Users_UserId"" FOREIGN KEY (""UserId"")
                        REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS ""IX_TeamMembers_AccountId"" ON ""TeamMembers""(""AccountId"");
                CREATE INDEX IF NOT EXISTS ""IX_TeamMembers_UserId"" ON ""TeamMembers""(""UserId"");

                CREATE TABLE IF NOT EXISTS ""ApiKeys"" (
                    ""Id"" uuid NOT NULL,
                    ""UserId"" uuid NOT NULL,
                    ""Name"" character varying(100) NOT NULL,
                    ""KeyHash"" character varying(64) NOT NULL,
                    ""KeyPrefix"" character varying(20) NOT NULL,
                    ""Scopes"" text[] NOT NULL DEFAULT ARRAY['read:transactions','read:dashboard'],
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""ExpiresAt"" timestamp with time zone,
                    ""LastUsedAt"" timestamp with time zone,
                    ""RequestCount"" bigint NOT NULL DEFAULT 0,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""RevokedAt"" timestamp with time zone,
                    CONSTRAINT ""PK_ApiKeys"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_ApiKeys_Users_UserId"" FOREIGN KEY (""UserId"")
                        REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ApiKeys_KeyHash"" ON ""ApiKeys""(""KeyHash"");
                CREATE INDEX IF NOT EXISTS ""IX_ApiKeys_UserId"" ON ""ApiKeys""(""UserId"");
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("ApiKeys");
            migrationBuilder.DropTable("TeamMembers");
            migrationBuilder.DropTable("Accounts");
        }
    }
}
