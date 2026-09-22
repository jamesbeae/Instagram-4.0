require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8000;
const sequelize = require("./config/database");
const cors = require("cors");
const credentials = require("./api/middlewares/credentials");
const corsOptions = require("./configs/cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { bodyParserUrlencodedConfigs } = require("./configs/bodyParser");
const router = require("./api/routes/index");
const setupSocket = require("./api/socketIo/socket");
const healthRoute = require("./routes/healthRoute");

app.use(credentials);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "35mb" }));
app.use(bodyParser.urlencoded(bodyParserUrlencodedConfigs));

app.use("/health", healthRoute);

// router:
app.use("/v1/api", router);

// Error handling:
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.status || 500;
    const message = error.message;
    res.status(status).json({ message: message });
});

sequelize
    .authenticate()
    .then(() => {
        const server = app.listen(PORT, () => {
            console.log(">>>>>>>>>I AM RUNNING IN PORT:" + PORT + "<<<<<<<<<");
        });

        setupSocket(server);
    })
    .catch((error) => {
        console.error("Unable to connect to PostgreSQL:", error.message);
        process.exitCode = 1;
    });
