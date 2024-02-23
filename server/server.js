const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");

app.use(cors());
app.use(express.json());

app.post('/Confirm_Order',async(req,res)=>{
  try{
    const {amb_id,user_id}=req.body;
    console.log(amb_id);
    console.log(user_id);
    const q = await pool.query(
      'UPDATE "Hello_Doc"."Order Ambulance" SET "Status"=$1 WHERE "Ambulance id"=$2 AND "user_id"=$3',[`Confirmed`,amb_id,user_id]
    )
    return res.json({success:1});
  }
  catch(err)
  {
    console.error(err);
    return res.json({success:2});
  }

});

app.post('/bookambulance', async (req, res) => {
  try {
    const { user_id, ambulance_id } = req.body;
    const check_Amb_Is_Already_Present = await pool.query(
      'SELECT "Ambulance id" FROM "Hello_Doc"."Order Ambulance" WHERE "Ambulance id"=$1',[ambulance_id] 
    );
    if(check_Amb_Is_Already_Present.rows.length>0) {
      return res.json({success:1});
    }

    const check_User_Is_Already_Present = await pool.query(
      'SELECT "user_id" FROM "Hello_Doc"."Order Ambulance" WHERE "user_id"=$1',[user_id] 
    );
    if(check_User_Is_Already_Present.rows.length>0) {
      return res.json({success:2});
    }

    const lastIDFromQuery=await pool.query(
      'SELECT "ID" FROM "Hello_Doc"."Order Ambulance" ORDER BY "ID" DESC LIMIT 1'
    );
    let lastID=0;
    if(lastIDFromQuery.rows.length>0) {
      lastID=lastIDFromQuery.rows[0]["ID"];
    }
    const newID=lastID+1;
    await pool.query(
      'INSERT INTO "Hello_Doc"."Order Ambulance" (user_id, "Ambulance id", "ID", "Status") VALUES ($1, $2, $3, $4)', 
      [user_id, ambulance_id, newID, "Pending"]
  );
  

    const userLocationQuery = await pool.query(
      'SELECT "Location" FROM "Hello_Doc"."User" WHERE "Reg. Number" = $1',
      [user_id]
    );
    if (userLocationQuery.rows.length > 0) {
      const userLocation = userLocationQuery.rows[0].Location;
      await pool.query(
        'UPDATE "Hello_Doc"."Ambulance" SET "Availability" = $1, "Current Location" = $2 WHERE "ID" = $3',
        [false, userLocation, ambulance_id]
    );
    }
    return res.json({ success: 3 });
  } catch (err) {
    console.error(err);
    return res.json({ success: 4 });
  }
});


//get all doctor info
app.get("/Hello_Doc", async (req, res) => {
  try {
    console.log("req coming");
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."Doctor";'
    );
    console.log(q.rows);
    return res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})
app.get("/Ambulance_Home", async (req, res) => {
  try {
    console.log("req coming");
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."Ambulance";'
    );
    console.log(q.rows);
    return res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})
//for Creating new Account
app.post("/Registration", async (req, res) => {
  try {
    console.log("Registration req coming");
    const {firstName, email,password,location} = req.body;
    const {"type":type} = req.headers;
    console.log(type)
    console.log(firstName,email,password,location);
    
    //for updating reg number automatically
    const lastRegNumberQuery = await pool.query(
      'SELECT "Reg. Number" FROM "Hello_Doc"."User" ORDER BY "Reg. Number" DESC LIMIT 1'
    );
    let lastRegNumber=0;
    if(lastRegNumberQuery.rows.length>0)
    {
      lastRegNumber = lastRegNumberQuery.rows[0]["Reg. Number"];
    }
    const newRegNumber = lastRegNumber + 1;

    const q = await pool.query(
      'INSERT INTO "Hello_Doc"."User" ("Reg. Number", "Name", "Email", "Password","Location") VALUES ($1, $2, $3, $4,$5) RETURNING *',
      [newRegNumber, firstName, email, password,location]    );
    console.log(q.rows);
    if(q.rows.length === 0)
      return res.sendStatus(401);
    return res.sendStatus(200);
    // return res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})

//For login 
app.post("/login", async (req, res) => {
  try {
    console.log("log in req coming");
    const {firstName,password} = req.body;
    const {"type":type} = req.headers;
    console.log(type)
    console.log(firstName,password);
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."User" where "Name" = $1 AND "Password"=$2;',[firstName,password]
    );
    console.log(q.rows);
    if(q.rows.length === 0)
      return res.sendStatus(401);
    //return res.sendStatus(200);
     return res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})
//Pending Ambulance Order Under An Ambulance
app.get("/Pending_AmbOrder/:ID", async (req, res) => {
  try {
    console.log("Pending data");
    const { ID } = req.params;
    const q = await pool.query(
      `SELECT "Hello_Doc"."Order Ambulance"."Ambulance id", "Hello_Doc"."User"."Reg. Number","Hello_Doc"."User"."Name", "Hello_Doc"."Order Ambulance"."Status","Hello_Doc"."User"."Location","Hello_Doc"."User"."Email"
      FROM "Hello_Doc"."Order Ambulance"
      JOIN "Hello_Doc"."Driver Info" ON "Hello_Doc"."Order Ambulance"."Ambulance id" = "Hello_Doc"."Driver Info"."ambulance_id"
      JOIN "Hello_Doc"."User" ON "Hello_Doc"."Order Ambulance"."user_id" = "Hello_Doc"."User"."Reg. Number"
      WHERE "Hello_Doc"."Driver Info"."driver_id" = $1 AND "Hello_Doc"."Order Ambulance"."Status" = 'Pending';`, [ID]
    );
    //console.log("req coming");
    console.log(q.rows);
    return res.json(q.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//Ambulace driver log in
app.post("/login/Driver", async (req, res) => {
  try {
    console.log("log in req coming for driver");
    const {firstName,password} = req.body;
    // const {"type":type} = req.headers;
    // console.log(type)
    //console.log("dsds");
    console.log(firstName,password);
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."Ambulance Driver" WHERE "driver_name" = $1 AND "contact" = $2',[firstName,password]
    );
    console.log(q.rows);
    if(q.rows.length === 0)
      return res.sendStatus(401);
    //return res.sendStatus(200);
     return res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})

//Hospital owner log in
app.post("/login/Hospital", async (req, res) => {
  try {
    console.log("log in req coming for Hospital Owner");
    const {firstName,password} = req.body;
    // const {"type":type} = req.headers;
    // console.log(type)
    //console.log("dsds");
    console.log(firstName,password);
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."Hospital Admin" WHERE "Name" = $1 AND "Password" = $2',[firstName,password]
    );
    console.log(q.rows);
    if(q.rows.length === 0)
      return res.sendStatus(401);
    //return res.sendStatus(200);
     return res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})

//Admin log in
app.post("/login/Admin", async (req, res) => {
  try {
    console.log("log in req coming for Admin");
    const {firstName,password} = req.body;
    // const {"type":type} = req.headers;
    // console.log(type)
    //console.log("dsds");
    console.log(firstName,password);
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."Admin" WHERE "Name" = $1 AND "Password" = $2',[firstName,password]
    );
    console.log(q.rows);
    if(q.rows.length === 0)
      return res.sendStatus(401);
    //return res.sendStatus(200);
     return res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})



//get info of a particular doctor with doc_id 
app.get("/Hello_Doc/:ID", async (req, res) => {
  try {
    const { ID } = req.params;
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."Doctor" WHERE "doc_id" = $1', [ID]
    );

    console.log(q.rows);
    res.json(q.rows);

  } catch (err) {
    console.error(err.message);
  }
})
// Search for a doctor by name
app.get("/Hello_Doc/search/doctor/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const results = await pool.query(
      'SELECT * FROM "Hello_Doc"."Doctor" WHERE "doc_name" = $1', [name]
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err.message);
  }
});

// Search for a doctor by speciality
app.get("/Hello_Doc/search/speciality/:speciality", async (req, res) => {
  try {
    const { speciality } = req.params;
    const results = await pool.query(
      'SELECT * FROM "Hello_Doc"."Doctor" WHERE "speciality" = $1', [speciality]
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err.message);
  }
});
//for driver login
app.post("/login/Driver", async (req, res) => { // Change to match the frontend endpoint
  try {
    console.log("log in req coming");
    const { firstName, password } = req.body;
    const q = await pool.query(
      'SELECT * FROM "Hello_Doc"."Ambulance Driver" WHERE "driver_name" = $1 AND "contact" = $2', 
      [firstName, password]
    );
    console.log(q.rows);
    if (q.rows.length === 0)
      return res.sendStatus(401);
    return res.json(q.rows);
  } catch (err) {
    console.error(err.message);
  }
});

// Search for a hospital by name
app.get("/Hello_Doc/search/hospital/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const results = await pool.query(
      'SELECT "Hello_Doc"."Doctor".doc_name,"Hello_Doc"."Doctor".email,"Hello_Doc"."Doctor".speciality,"Hello_Doc"."Doctor"."location" FROM "Hello_Doc"."Doctor" JOIN "Hello_Doc"."Doctor Visit" ON "Hello_Doc"."Doctor"."doc_id" = "Hello_Doc"."Doctor Visit"."Doc_id" JOIN "Hello_Doc"."Hospital" ON "Hello_Doc"."Doctor Visit"."hos_id" = "Hello_Doc"."Hospital"."hos_id" WHERE "Hello_Doc"."Hospital"."hos_name" = $1', [name]

    );
    res.json(results.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//Search Ambulance under a hospital
app.get("/Hospital_Home", async (req, res) => {
  try {
    const { name } = req.params;
    const results = await pool.query(
      `SELECT "Hello_Doc"."Ambulance"."ID","Hello_Doc"."Ambulance"."Contact","Hello_Doc"."Ambulance"."AC", "Hello_Doc"."Ambulance"."Is_MICU", "Hello_Doc"."Ambulance"."Current Location", "Hello_Doc"."Ambulance"."Price_per_hour", "Hello_Doc"."Ambulance"."Availability"
        FROM "Hello_Doc"."Ambulance"
        JOIN "Hello_Doc"."Manage Ambulance" ON "Hello_Doc"."Ambulance"."ID" = "Hello_Doc"."Manage Ambulance"."ambulance_id"
        JOIN "Hello_Doc"."Hospital" ON "Hello_Doc"."Manage Ambulance"."hos_id" = "Hello_Doc"."Hospital"."hos_id"
        WHERE "Hello_Doc"."Hospital"."hos_name" = $1;`, [name]
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//search Ambulance under a price range
app.get("/Hello_Doc/search/price/:price", async (req, res) => {
  try {
    const { price } = req.params;
    const results = await pool.query(
      `SELECT * FROM "Hello_Doc"."Ambulance"
      WHERE CAST("Price_per_hour" AS numeric) <= $1;`, [price]
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err.message);
  }
});
//if ambulance has ac
app.get("/Hello_Doc/search/ac", async (req, res) => {
  try {
    const results = await pool.query(
      `SELECT * FROM "Hello_Doc"."Ambulance"
      WHERE "Hello_Doc"."Ambulance"."AC"=TRUE;`
    );
    res.json(results.rows);

  }
  catch (err) {
    console.error(err.message);

  }

});
//if ambulance has micu
app.get("/Hello_Doc/search/micu", async (req, res) => {
  try {
    const results = await pool.query(
      `SELECT * FROM "Hello_Doc"."Ambulance"
      WHERE "Hello_Doc"."Ambulance"."Is_MICU"=TRUE;`
    );
    res.json(results.rows);

  }
  catch (err) {
    console.error(err.message);

  }

});
//if ambulance is available
app.get("/Hello_Doc/search/avail", async (req, res) => {
  try {
    const results = await pool.query(
      `SELECT * FROM "Hello_Doc"."Ambulance"
      WHERE "Hello_Doc"."Ambulance"."Availability"=TRUE;`
    );
    res.json(results.rows);

  }
  catch (err) {
    console.error(err.message);

  }

});

app.listen(5000, () => {
  console.log("Connected.");
});