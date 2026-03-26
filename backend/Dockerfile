FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/FinancialCopilot.API/FinancialCopilot.API.csproj", "src/FinancialCopilot.API/"]
COPY ["src/FinancialCopilot.Application/FinancialCopilot.Application.csproj", "src/FinancialCopilot.Application/"]
COPY ["src/FinancialCopilot.Domain/FinancialCopilot.Domain.csproj", "src/FinancialCopilot.Domain/"]
COPY ["src/FinancialCopilot.Infrastructure/FinancialCopilot.Infrastructure.csproj", "src/FinancialCopilot.Infrastructure/"]

RUN dotnet restore "src/FinancialCopilot.API/FinancialCopilot.API.csproj"

COPY . .

RUN dotnet publish "src/FinancialCopilot.API/FinancialCopilot.API.csproj" \
    -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FinancialCopilot.API.dll"]
