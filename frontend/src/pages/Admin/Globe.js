import React, { useLayoutEffect } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const Globe = () => {
    useLayoutEffect(() => {
        const root = am5.Root.new("chartdiv");

        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5map.MapChart.new(root, {
                panX: "rotateX",
                panY: "rotateY",
                projection: am5map.geoOrthographic(),
                homeGeoPoint: { latitude: 28.6139, longitude: 77.2090 }, // Delhi
                homeZoomLevel: 1,
                rotationX: -77.2090,
                rotationY: -28.6139,
            })
        );

        chart.animate({
            key: "rotationX",
            to: 360,
            duration: 60000,
            loops: Infinity,
        });

        chart.animate({
            key: "rotationY",
            to: 360,
            duration: 120000,
            loops: Infinity,
        });

        const polygonSeries = chart.series.push(
            am5map.MapPolygonSeries.new(root, {
                geoJSON: am5geodata_worldLow,
                exclude: ["AQ"],
                fill: am5.color(0xd0d0d0),
                stroke: am5.color(0xffffff),
            })
        );

        polygonSeries.mapPolygons.template.setAll({
            stroke: am5.color(0x000000),      // black stroke
            strokeWidth: 1,
            strokeDasharray: [4, 4],          // dotted line: 4px dash, 4px gap
            fill: am5.color(0x0000),        // you can keep your fill color here
        });
        const pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));

        // Use ONE lineSeries for all lines, specify lineType: "curved" or "straight"
        let lineSeries = chart.series.push(
            am5map.MapLineSeries.new(root, {
                stroke: am5.color(0x00aaff),
                strokeWidth: 2,
                fill: am5.color(0x00aaff),
            })
        );

        // Multiple routes data
        const internationalRoutes = [
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "New York", lat: 40.7128, lon: -74.006 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "London", lat: 51.5074, lon: -0.1278 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Paris", lat: 48.8566, lon: 2.3522 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Tokyo", lat: 35.6895, lon: 139.6917 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Sydney", lat: -33.8688, lon: 151.2093 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Moscow", lat: 55.7558, lon: 37.6173 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Dubai", lat: 25.2048, lon: 55.2708 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Singapore", lat: 1.3521, lon: 103.8198 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Berlin", lat: 52.5200, lon: 13.4050 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Rome", lat: 41.9028, lon: 12.4964 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Toronto", lat: 43.65107, lon: -79.347015 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "San Francisco", lat: 37.7749, lon: -122.4194 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Cape Town", lat: -33.9249, lon: 18.4241 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Seoul", lat: 37.5665, lon: 126.9780 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Bangkok", lat: 13.7563, lon: 100.5018 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Amsterdam", lat: 52.3676, lon: 4.9041 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Istanbul", lat: 41.0082, lon: 28.9784 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Zurich", lat: 47.3769, lon: 8.5417 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Mexico City", lat: 19.4326, lon: -99.1332 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Lisbon", lat: 38.7223, lon: -9.1393 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Madrid", lat: 40.4168, lon: -3.7038 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Helsinki", lat: 60.1695, lon: 24.9354 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Vienna", lat: 48.2082, lon: 16.3738 }],
            [{ name: "Kolkata", lat: 22.5726, lon: 88.3639 }, { name: "Copenhagen", lat: 55.6761, lon: 12.5683 }],
            [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Athens", lat: 37.9838, lon: 23.7275 }],
            [{ name: "Kolkata", lat: 22.5726, lon: 88.3639 }, { name: "Edinburgh", lat: 55.9533, lon: -3.1883 }],
            [{ name:"Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Brussels", lat: 50.8503, lon: 4.3517 }],
            [{ name: "Kolkata", lat: 22.5726, lon: 88.3639 }, { name: "Oslo", lat: 59.9139, lon: 10.7522 }],
            [{ name: "Kolkata", lat: 22.5726, lon: 88.3639 }, { name: "Kuala Lumpur", lat: 3.1390, lon: 101.6869 }]
        ];

        // const domesticRoutes = [
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Mumbai", lat: 19.0760, lon: 72.8777 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Bengaluru", lat: 12.9716, lon: 77.5946 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Kolkata", lat: 22.5726, lon: 88.3639 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Chennai", lat: 13.0827, lon: 80.2707 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Hyderabad", lat: 17.3850, lon: 78.4867 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Pune", lat: 18.5204, lon: 73.8567 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Jaipur", lat: 26.9124, lon: 75.7873 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Lucknow", lat: 26.8467, lon: 80.9462 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Kanpur", lat: 26.4499, lon: 80.3319 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Nagpur", lat: 21.1458, lon: 79.0882 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Indore", lat: 22.7196, lon: 75.8577 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Thane", lat: 19.2183, lon: 72.9781 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Bhopal", lat: 23.2599, lon: 77.4126 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Visakhapatnam", lat: 17.6868, lon: 83.2185 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Pimpri-Chinchwad", lat: 18.6298, lon: 73.7997 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Patna", lat: 25.5941, lon: 85.1376 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Vadodara", lat: 22.3072, lon: 73.1812 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Ghaziabad", lat: 28.6692, lon: 77.4538 }],
        //     [{ name: "Delhi", lat: 28.6139, lon: 77.2090 }, { name: "Ludhiana", lat: 30.9000, lon: 75.8573 }]
        // ];

        const routes = [...internationalRoutes];


        // For each route, create points and lines
        const allCityPoints = [];

        routes.forEach((route) => {
            route.forEach((city) => {
                // Push city points only once, avoid duplicates by checking name
                if (!allCityPoints.find((p) => p.name === city.name)) {
                    allCityPoints.push(city);
                    pointSeries.pushDataItem({
                        latitude: city.lat,
                        longitude: city.lon,
                        tooltipText: city.name,
                    });
                }
            });
        });

        // Create line data items for each route on the single lineSeries
        const lineDataItems = routes.map((route) => {
            // For each city in route, find the matching pushed point data item
            const pointsToConnect = route.map((city) =>
                pointSeries.dataItems.find(
                    (di) =>
                        di.get("latitude") === city.lat && di.get("longitude") === city.lon
                )
            );
            return lineSeries.pushDataItem({ pointsToConnect });
        });

        // Create one planeSeries per route for independent plane bullets and animation
        lineDataItems.forEach((lineDataItem, idx) => {
            const planeSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));

            // Plane icon
            const planePicture = am5.Picture.new(root, {
                width: 32,
                height: 32,
                centerX: am5.p50,
                centerY: am5.p50,
                src: "https://cdn3.iconfinder.com/data/icons/avion/512/airport-1024.png",
            });

            // Add bullet with planePicture
            planeSeries.bullets.push(() =>
                am5.Bullet.new(root, {
                    sprite: planePicture,
                })
            );

            // Create plane data item moving along the specific line
            const planeDataItem = planeSeries.pushDataItem({
                lineDataItem,
                positionOnLine: 0,
                autoRotate: true,
            });

            planeDataItem.dataContext = { prevPosition: 0 };

            // Animate plane on line from 0 to 1, looping infinitely
            planeDataItem.animate({
                key: "positionOnLine",
                to: 1,
                duration: 20000 + idx * 5000, // different speeds per plane for fun
                loops: Infinity,
                easing: am5.ease.linear,
            });

            // Flip plane icon based on travel direction
            planeDataItem.on("positionOnLine", (value) => {
                if (planeDataItem.dataContext.prevPosition < value) {
                    planePicture.set("rotation", 0);
                } else {
                    planePicture.set("rotation", 180);
                }
                planeDataItem.dataContext.prevPosition = value;
            });
        });

        chart.appear(1000, 100);

        return () => {
            root.dispose();
        };
    }, []);

    return <div id="chartdiv" style={{ width: "100%", height: "100vh" }} />;
};

export default Globe;
