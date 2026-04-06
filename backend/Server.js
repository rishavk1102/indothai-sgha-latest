const express = require("express");
const sequelize = require("./config/database");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const http = require("http");
require("dotenv").config();

// Definition of routes
const authRoutes = require("./Routes/AuthRoutes");
const ClientAuthRoutes = require("./Routes/ClientAuthRoutes");
const ForgotPasswordRoutes = require("./Routes/ForgotPassword");
const ForgotPasswordClientRoutes = require("./Routes/ForgotPasswordClient");
const personalInformationRoutes = require("./Routes/PersonalInformationRoutes");
const RoleRoutes = require("./Routes/RolesRoutes");
const promotionRoutes = require("./Routes/VerificationRoutes");
const profileimgRoutes = require("./Routes/ProfileimageRoutes");
const BusinessRoutes = require("./Routes/BusinessRoutes");
const AirportRoutes = require("./Routes/AirportRoutes");
const ClientRoutes = require("./Routes/ClientRoutes");
const AirlineRoutes = require("./Routes/AirlineRoutes");
const AircraftRoutes = require("./Routes/AircraftRoutes");
const CategoryRoutes = require("./Routes/Category_Routes");
const SGHARoutes = require("./Routes/SGHARoutes");
const AnnexureARoutes = require("./Routes/AnnexureARoutes");
const AircraftCategoryRoutes = require("./Routes/AircraftCategoryRoutes");
const FlightTypeRoutes = require("./Routes/FlightTypeRoutes");
const ServicePriceRoutes = require("./Routes/ServicePriceRoutes");
const AdditionalChargesRoutes = require("./Routes/AdditionalChargesNewRoutes");
const SGHA_Annex_Template_Routes = require("./Routes/SGHA_Annex_Template_Routes");
const AnnexARoutes = require("./Routes/AnnexARoutes");
const CompanyAircraftRoutes = require("./Routes/CompanyAircraftRoutes");
const SghaTemplateContentRoutes = require("./Routes/SghaTemplateContentRoutes");
const TemplateYearsRoutes = require("./Routes/TemplateYearsRoutes");
const ClientAnnexASubmissionRoutes = require("./Routes/ClientAnnexASubmissionRoutes");
const ClientAnnexBSubmissionRoutes = require("./Routes/ClientAnnexBSubmissionRoutes");
const PdfUploadsRoutes = require("./Routes/PdfUploadsRoutes");

// Import SubmissionEditHistory model so it is registered with Sequelize for sync
require("./NewModels/SubmissionEditHistory");

// Import association initializer
const createUserAssociations = require("./Flow/UserAssociations");
const createAnnexureAssociations = require("./Flow/AnnexureAssociations");
const createAnnxAssociations = require("./Flow/AnnxAssociation");

const app = express();

// Define allowed origins before CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "https://ghostwhite-giraffe-236477.hostingersite.com",
  "https://indothai.72.61.173.50.sslip.io"
];

// CORS must be set up before other middleware to handle preflight requests
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for now, can be restricted later
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/** Large SGHA template payloads (HTML + JSON fields) exceed default ~100kb body limit */
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || "50mb";

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
app.use(cookieParser());

const server = http.createServer(app); // Create HTTP server
const initializeSockets = require("./sockets/socketHandler");
initializeSockets(server); // Initialize WebSocket server

// Automated Cronjob Paths

const port = process.env.PORT || 7072;

const publicRoot = path.resolve(__dirname, "./dist");

// Routes Path
app.use("/AuthRoutes", authRoutes);
app.use("/ClientAuthRoutes", ClientAuthRoutes);
app.use("/promotion", promotionRoutes);
app.use("/Forgot", ForgotPasswordRoutes);
app.use("/ForgotClient", ForgotPasswordClientRoutes);
app.use("/roles", RoleRoutes);
app.use("/personal", personalInformationRoutes);
app.use("/proimage", profileimgRoutes);
app.use("/business", BusinessRoutes);
app.use("/airports", AirportRoutes);
app.use("/clients", ClientRoutes);
app.use("/airlines", AirlineRoutes);
app.use("/aircrafts", AircraftRoutes);
app.use("/categories", CategoryRoutes);
app.use("/sgha", SGHARoutes);
app.use("/AnnexureARoutes", AnnexureARoutes);
app.use("/aircraft_category", AircraftCategoryRoutes);
app.use("/flight_type", FlightTypeRoutes);
app.use("/service_price", ServicePriceRoutes);
app.use("/additional_charge", AdditionalChargesRoutes);
app.use("/sgha_annex_template", SGHA_Annex_Template_Routes);
app.use("/annxroutes", AnnexARoutes);
app.use("/company_aircraft_routes", CompanyAircraftRoutes);
app.use("/sgha_template_content", SghaTemplateContentRoutes);
app.use("/template_years", TemplateYearsRoutes);
app.use("/api/client", ClientAnnexASubmissionRoutes);
app.use("/api/client", ClientAnnexBSubmissionRoutes);
app.use("/api/pdf-uploads", PdfUploadsRoutes);

// Test DB connection
app.get("/database-connection", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.send("Database connection has been established successfully.");
  } catch (error) {
    res.status(500).send("Unable to connect to the database:", error);
  }
});

//Serve static files from React app
app.use(express.static(publicRoot));

// Serve React app for any route not handled by static files or API routes
app.use((req, res, next) => {
  // Only handle GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  // Skip API routes
  if (req.path.startsWith('/AuthRoutes') || 
      req.path.startsWith('/ClientAuthRoutes') ||
      req.path.startsWith('/promotion') ||
      req.path.startsWith('/Forgot') ||
      req.path.startsWith('/roles') ||
      req.path.startsWith('/personal') ||
      req.path.startsWith('/proimage') ||
      req.path.startsWith('/business') ||
      req.path.startsWith('/airports') ||
      req.path.startsWith('/clients') ||
      req.path.startsWith('/airlines') ||
      req.path.startsWith('/aircrafts') ||
      req.path.startsWith('/categories') ||
      req.path.startsWith('/sgha') ||
      req.path.startsWith('/AnnexureARoutes') ||
      req.path.startsWith('/aircraft_category') ||
      req.path.startsWith('/flight_type') ||
      req.path.startsWith('/service_price') ||
      req.path.startsWith('/additional_charge') ||
      req.path.startsWith('/sgha_annex_template') ||
      req.path.startsWith('/annxroutes') ||
      req.path.startsWith('/company_aircraft_routes') ||
      req.path.startsWith('/sgha_template_content') ||
      req.path.startsWith('/template_years') ||
      req.path.startsWith('/api/client') ||
      req.path.startsWith('/database-connection')) {
    return next();
  }
  
  // Serve index.html for all other GET requests
  res.sendFile(path.join(publicRoot, "index.html"), (err) => {
    if (err) {
      console.error("Error serving index.html:", err);
      res.status(404).send("Not found");
    }
  });
});

// Initialize associations
createUserAssociations();
createAnnexureAssociations();
createAnnxAssociations();

// Function to test database connection with retries
async function connectDatabase(maxRetries = 3, retryDelay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      console.log("✅ Database connection authenticated successfully");
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // Last attempt failed, show detailed error
        console.error('\n📋 Connection Configuration:');
        console.error(`   Host: ${process.env.DB_HOST}`);
        console.error(`   Port: ${parseInt(process.env.DB_PORT, 10) || 3306}`);
        console.error(`   Database: ${process.env.DB_NAME}`);
        console.error(`   User: ${process.env.DB_USER}`);
        
        if (error.name === 'SequelizeAccessDeniedError' || error.original?.code === 'ER_ACCESS_DENIED_ERROR') {
          console.error('\n💡 Access Denied Error - Possible causes:');
          console.error('   1. Incorrect password in .env file');
          console.error('   2. User does not have permission to connect from this IP address');
          console.error('   3. User does not exist or has been deleted');
          console.error('\n   For Coolify MySQL Database:');
          console.error('   - Use the "Normal User" credentials (user: mysql) from Coolify config');
          console.error('   - Use the "MySQL URL (internal)" for connections within Coolify network');
          console.error('   - Use the "MySQL URL (public)" for external connections');
          console.error('   - Database name should be: Indothai_SGHADB');
          console.error('   - Port should be 3306 (internal) or 5431 (public) - NOT 5432');
          console.error('\n   To fix MySQL permissions in Coolify:');
          console.error('   1. Go to your MySQL database project in Coolify');
          console.error('   2. Check the "Normal User" and "Normal User Password" fields');
          console.error('   3. Use these credentials in your .env file:');
          console.error('      DB_USER=mysql');
          console.error('      DB_PASSWORD=<normal_user_password_from_coolify>');
          console.error('      DB_NAME=Indothai_SGHADB');
          console.error('      DB_HOST=<mysql_service_name_or_internal_url>');
          console.error('      DB_PORT=3306');
        } else if (error.name === 'SequelizeConnectionRefusedError') {
          console.error('\n💡 Connection Refused - Possible causes:');
          console.error('   1. MySQL server is not running (check Coolify dashboard)');
          console.error('   2. Wrong host or port in .env file');
          console.error('   3. Firewall blocking the connection');
          console.error('\n   For Coolify:');
          console.error('   - Ensure MySQL database is "Running (healthy)" in Coolify');
          console.error('   - Use internal service name for DB_HOST when in same network');
          console.error('   - Use public IP/domain for DB_HOST when connecting externally');
          console.error('   - Port should be 3306 (internal) or 5431 (public)');
        } else if (error.name === 'SequelizeConnectionTimedOutError') {
          console.error('\n💡 Connection Timeout - Possible causes:');
          console.error('   1. Network connectivity issues');
          console.error('   2. MySQL server is overloaded');
          console.error('   3. Firewall blocking the connection');
        }
        return false;
      }
    }
  }
}

// Initialize database connection and start server
(async () => {
  const connected = await connectDatabase(3, 5000);
  
  if (!connected) {
    console.error('\n❌ Failed to connect to database after multiple attempts. Exiting...');
    process.exit(1);
  }

  try {
    console.log("🔄 Synchronizing database models...");
    
    // List all models that will be synced
    const models = Object.keys(sequelize.models);
    if (models.length > 0) {
      console.log(`📋 Found ${models.length} model(s) to sync:`);
      models.forEach((modelName, index) => {
        console.log(`   ${index + 1}. ${modelName}`);
      });
    }
    
    // Enable verbose logging for sync to show all SQL commands
    const originalLogging = sequelize.options.logging;
    sequelize.options.logging = (msg) => {
      // Always log SQL queries during sync
      if (msg && typeof msg === 'string') {
        console.log('📝 SQL:', msg);
      } else if (msg) {
        console.log('📝 SQL:', JSON.stringify(msg, null, 2));
      }
    };
    
    await sequelize.sync();
    
    // Restore original logging
    sequelize.options.logging = originalLogging;
    
    console.log("✅ Database synchronized successfully");
    
    // ✅ Use server.listen, not app.listen
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Error synchronizing database:", err.message);
    console.error("Full error:", err);
    process.exit(1);
  }
})();

module.exports = app;
