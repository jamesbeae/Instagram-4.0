const { Sequelize } = require("sequelize");

const normalizeEnvValue = (value) => {
    if (value === undefined || value === null) return undefined;

    const normalized = String(value).trim().replace(/,$/, "");
    if (
        (normalized.startsWith('"') && normalized.endsWith('"')) ||
        (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
        return normalized.slice(1, -1);
    }

    return normalized;
};

const envValue = (name) => normalizeEnvValue(process.env[name]);
const databaseUrl = envValue("DATABASE_URL");
const logging = envValue("DB_LOGGING") === "true" ? console.log : false;

const sequelize = databaseUrl
    ? new Sequelize(databaseUrl, {
          dialect: "postgres",
          logging,
          dialectOptions:
              process.env.DATABASE_SSL === "true"
                  ? {
                        ssl: {
                            require: true,
                            rejectUnauthorized: false,
                        },
                    }
                  : {},
      })
    : new Sequelize(
          envValue("DB_DATABASE") || envValue("DB_NAME") || "instagram",
          envValue("DB_USERNAME") || envValue("DB_USER") || "postgres",
          envValue("DB_PASSWORD") || "postgres",
          {
              host: envValue("DB_HOST") || "localhost",
              port: Number(
                  envValue("POSTGRES_PORT") || envValue("DB_PORT") || 5432
              ),
              dialect: "postgres",
              logging,
          }
      );

module.exports = sequelize;
