const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const AircraftCategory = require('../../Models/AircraftCategory');
const FlightType = require("../../Models/FlightType");
const ServicePrice = require("../../Models/ServicePrice");
const Category = require("../../Models/Category");
const checkSocketPermission = require("../../middleware/checkSocketPermission");


module.exports = (io, socket) => {
    // socket.on("view-service-prices", async ({
    //     role_id,
    //     page_name,
    //     flight_type_id,
    //     business_id,
    //     airport_id
    // }) => {
    //     const { allowed, error } = await checkSocketPermission(role_id, "view", page_name);
    //     if (!allowed) {
    //         return socket.emit("view-service-prices-error", { message: error });
    //     }

    //     try {
    //         // ✅ Require all 3 IDs
    //         if (!flight_type_id || !business_id || !airport_id) {
    //             return socket.emit("view-service-prices-no-content", {
    //                 status: 204,
    //                 message: "Missing required identifiers (flight_type_id, business_id, airport_id)."
    //             });
    //         }

    //         const whereClause = {
    //             Flight_type_id: flight_type_id,
    //             Business_id: business_id,
    //             Airport_id: airport_id
    //         };

    //         const servicePrices = await ServicePrice.findAll({
    //             where: whereClause,
    //             include: [
    //                 { model: AircraftCategory, as: "aircraftCategory", attributes: ["Aircraft_category_id", "Category_name"] },
    //                 { model: Category, as: "serviceCategory", attributes: ["category_id", "name"] }, // services
    //             ],
    //             order: [["Aircraft_category_id", "ASC"]]
    //         });

    //         if (!servicePrices || servicePrices.length === 0) {
    //             return socket.emit("view-service-prices-error", {
    //                 message: "No service prices found."
    //             });
    //         }

    //         // Format like the screenshot
    //         const grouped = {};
    //         servicePrices.forEach(sp => {
    //             const aircraftName = sp.aircraftCategory.Category_name;
    //             if (!grouped[aircraftName]) {
    //                 grouped[aircraftName] = [];
    //             }
    //             grouped[aircraftName].push({
    //                 service: sp.serviceCategory.name,
    //                 price: sp.Price
    //             });
    //         });

    //         socket.emit("view-service-prices-success", grouped);

    //     } catch (err) {
    //         console.error("❌ Failed to fetch service prices:", err);
    //         socket.emit("view-service-prices-error", {
    //             message: "Failed to fetch service prices.",
    //             error: err.message
    //         });
    //     }
    // });


    socket.on("view-service-prices", async ({
        role_id,
        page_name,
        flight_type_id,
        business_id,
        airport_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "view", page_name);
        if (!allowed) {
            return socket.emit("view-service-prices-error", { message: error });
        }

        try {
            // ✅ Require all 3 IDs
            if (!flight_type_id || !business_id || !airport_id) {
                return socket.emit("view-service-prices-no-content", {
                    status: 204,
                    message: "Missing required identifiers (flight_type_id, business_id, airport_id)."
                });
            }

            const whereClause = {
                Flight_type_id: flight_type_id,
                Business_id: business_id,
                Airport_id: airport_id
            };

            const servicePrices = await ServicePrice.findAll({
                where: whereClause,
                attributes: ["Service_Price_id", "Price", "Business_id", "Airport_id", "Flight_type_id"], // 👈 include required fields
                include: [
                    {
                        model: AircraftCategory,
                        as: "aircraftCategory",
                        attributes: ["Aircraft_category_id", "Category_name"]
                    },
                    {
                        model: Category,
                        as: "serviceCategory",
                        attributes: ["category_id", "name"]
                    }
                ],
                order: [["Aircraft_category_id", "ASC"]]
            });


            if (!servicePrices || servicePrices.length === 0) {
                return socket.emit("view-service-prices-error", {
                    message: "No service prices found."
                });
            }

            // ✅ Group by aircraft name
            const grouped = {};
            servicePrices.forEach(sp => {
                const aircraftName = sp.aircraftCategory.Category_name;
                if (!grouped[aircraftName]) {
                    grouped[aircraftName] = {
                        aircraft_id: sp.aircraftCategory.Aircraft_category_id,
                        aircraft_name: sp.aircraftCategory.Category_name,
                        business_id: sp.Business_id,  // 👈 added
                        airport_id: sp.Airport_id,    // 👈 added
                        flight_type_id: sp.Flight_type_id,    // 👈 added
                        services: []
                    };
                }

                grouped[aircraftName].services.push({
                    service_price_id: sp.Service_Price_id,  // unique row
                    service: sp.serviceCategory.name,
                    service_id: sp.serviceCategory.category_id, // 👈 this is the same across aircrafts
                    price: sp.Price
                });
            });

            socket.emit("view-service-prices-success", grouped);

        } catch (err) {
            console.error("❌ Failed to fetch service prices:", err);
            socket.emit("view-service-prices-error", {
                message: "Failed to fetch service prices.",
                error: err.message
            });
        }
    });





};