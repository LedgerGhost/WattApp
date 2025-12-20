//a
const PROVIDER_NAME = "bestPowerGR";
const { points } = require("../utils/database");   // <-- ΑΥΤΟ πρέπει να υπάρχει πριν τις functions
const { formatLocalTimestamp } = require("../utils/time");


exports.getPoints = (req,res)=>{
   const status = req.query.status;

   let result = points;

   if (status) {
      const allowed = ["available", "charging", "reserved", "malfunction", "offline"];

      if (!allowed.includes(status)) {
         return res.status(401).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 401,
            error:`Invalid status '${status}'`,
            debuginfo:"Allowed values: available, charging, reserved, malfunction, offline"
         });
      }

      result = points.filter(p => p.status === status);
   }

   result = result.map(p => ({ providerName: PROVIDER_NAME, ...p }));
   res.json(result);
};
