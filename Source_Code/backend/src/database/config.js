require("dotenv").config();

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

const baseConfig = {
    dialect: "postgres",
    logging: envValue("DB_LOGGING") === "true",
};

const connectionConfig = () => {
    if (envValue("DATABASE_URL")) {
        return { ...baseConfig, url: envValue("DATABASE_URL") };
    }

    return {
        ...baseConfig,
        database: envValue("DB_DATABASE") || envValue("DB_NAME") || "instagram",
        username: envValue("DB_USERNAME") || envValue("DB_USER") || "postgres",
        password: envValue("DB_PASSWORD") || "postgres",
        host: envValue("DB_HOST") || "localhost",
        port: Number(envValue("POSTGRES_PORT") || envValue("DB_PORT") || 5432),
    };
};

module.exports = {
    development: connectionConfig(),
    test: connectionConfig(),
    production: connectionConfig(),
};
