const http = require("http");

// Test real-time by updating order status
const orderId = "6895fc00002034f1a7eee3db"; // Second order
const data = JSON.stringify({ status: "completed" });

const options = {
  hostname: "localhost",
  port: 8001,
  path: `/api/admin/orders/${orderId}/status`,
  method: "PUT",
  headers: {
    "x-access-token": "demo-admin-token",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
  },
};

console.log("Testing real-time order activities...");
const req = http.request(options, (res) => {
  let responseData = "";
  res.on("data", (chunk) => (responseData += chunk));
  res.on("end", () => {
    console.log("✅ Order Update Status:", res.statusCode);
    console.log("📝 Response:", responseData);

    // Wait a moment then check dashboard activities
    setTimeout(() => {
      const dashboardOptions = {
        hostname: "localhost",
        port: 8001,
        path: "/api/admin/dashboard",
        method: "GET",
        headers: {
          "x-access-token": "demo-admin-token",
          "Content-Type": "application/json",
        },
      };

      const dashboardReq = http.request(dashboardOptions, (dashRes) => {
        let dashData = "";
        dashRes.on("data", (chunk) => (dashData += chunk));
        dashRes.on("end", () => {
          try {
            const dashResponse = JSON.parse(dashData);
            console.log(
              "\n📋 Recent activities (should show new order status change):"
            );
            const activities = dashResponse.data?.activities || [];
            activities.slice(0, 5).forEach((activity, index) => {
              const time = new Date(activity.timestamp).toLocaleTimeString();
              console.log(
                `${index + 1}. [${time}] ${activity.type}: ${activity.text}`
              );
            });

            console.log("\n📊 Enhanced System Status:");
            const status = dashResponse.data?.systemStatus || {};
            console.log(
              "- Database:",
              status.database?.status,
              "(Response time:",
              status.database?.responseTime + "ms)"
            );
            console.log(
              "- Server uptime:",
              Math.floor(status.server?.uptime / 60),
              "minutes"
            );
            console.log(
              "- Memory usage:",
              status.server?.memory?.usagePercent + "%"
            );
            console.log("- Overall health:", status.overall?.status);
          } catch (e) {
            console.log("Dashboard error:", e.message);
            console.log("Raw response:", dashData);
          }
        });
      });

      dashboardReq.on("error", (e) =>
        console.error("❌ Dashboard request error:", e.message)
      );
      dashboardReq.end();
    }, 1000);
  });
});

req.on("error", (e) => console.error("❌ Request error:", e.message));
req.write(data);
req.end();
