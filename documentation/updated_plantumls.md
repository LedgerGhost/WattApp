# Updated PlantUML Diagrams based on Actual Implementation

## 1. System Block Diagram
Reflects the actual architecture: Mongoose/MongoDB, Express Backend, React Frontend. External integrations like Payment Gateway are not active in the current codebase (simulated/storage only). Navigation is a direct redirection to Google Maps.

```plantuml
@startuml
title System Block Diagram - WattApp (Actual Implementation)

skinparam rectangleStyle rounded
skinparam shadowing false
skinparam title {
  BackgroundColor #fdf6e3
  BorderColor #b58900
}

!define INTERNAL_COLOR #fef9e7
!define EXTERNAL_COLOR #ddeaf1
!define FRONTEND_COLOR #d6efc7
!define BACKEND_COLOR #fce1e4
!define DB_COLOR #e1d5e7

rectangle "EV Driver\n(Web/Mobile)" as Driver EXTERNAL_COLOR
rectangle "Google Maps" as Maps EXTERNAL_COLOR

rectangle "WattApp System" as System INTERNAL_COLOR {
  
  rectangle "Front-End\n(React/Vite)" as FE FRONTEND_COLOR
  rectangle "REST API & Backend\n(Express.js)" as BE BACKEND_COLOR
  rectangle "Database\n(MongoDB)" as DB DB_COLOR
  
}

Driver <--> FE : HTTPS / User Interaction
FE <--> BE : REST API (JSON)
BE <--> DB : Mongoose ODM

' Navigation is a direct redirect from Backend/Frontend logic to Google Maps URL
BE ..> Maps : Redirects User (URL Generation)
Driver --> Maps : Navigation Logic (External App)

@enduml
```

## 2. Use Case 1: Access Management
Reflects the actual authentication flow: No email verification, no 2FA, token-based session (Opaque Token stored in DB), name splitting logic on signup.

```plantuml
@startuml
title User Registration and Login - Actual Implementation

|User|
start
:Access system;

if (Has account?) then (no)
  :Click "Register";
  :Fill registration form:
  - Full Name
  - Email, Password
  - Phone;
  
  |Front-End|
  :Send POST /api/auth/signup;
  
  |Back-End|
  :Receive payload;
  :Split Full Name into First/Last Name;
  :Check if Email exists;
  :Hash Password (bcrypt);
  :Create User (role='customer', status='active');
  :Save to DB;
  :Return Success (200 OK);
  
  |Front-End|
  :Display Success Message;
  :Redirect to Login;
  
else (yes)
endif

|User|
:Navigate to login;
:Enter email & password;
:Click "Login";

|Front-End|
:Send POST /api/auth/login;

|Back-End|
:Find User by Email;
:Compare Password (bcrypt);

if (Valid Credentials?) then (yes)
  :Create AuthSession;
  :Generate Session Token (Opaque);
  :Update Last Login;
  :Return Token, Email, Role;
  
  |Front-End|
  :Store Token in LocalStorage;
  :Determine Redirect based on Role;
  :Redirect to Dashboard/Map;
else (no)
  |Back-End|
  :Return Error (400);
  |Front-End|
  :Display "Invalid email or password";
endif

stop
@enduml
```

## 3. Use Case 2: Filter Charging Stations
Reflects the actual search capability: Backend supports filtering only by `status`. Other filtering (if any) is either not implemented or client-side. Map loading brings all points.

```plantuml
@startuml
title Filter Charging Stations - Actual Implementation

|User|
start
:Open Map/List View;

|Front-End|
:Call GET /api/points (or /pointsinfo);

|Back-End|
:Query Database (All Points);
:Return JSON List of Points;

|Front-End|
:Receive Points Data;
:Render Pins on Map;

|User|
:Select Filter (e.g., "Available Only");

|Front-End|
if (Filter Type) then (Status)
  :Call GET /api/points?status=available;
  
  |Back-End|
  :Query DB for {status: 'available'};
  :Return Filtered List;
  
  |Front-End|
  :Update Map/List;
else (Other Filters)
  note right
    Backend only supports 'status' filter.
    Other filters (price, type) must be
    handled client-side or are not supported.
  end note
  :Filter data locally (Browser);
  :Update Map/List;
endif

|User|
:View Filtered Results;

stop
@enduml
```

## 4. Use Case 3: Reserve and Navigate
Reflects the actual reservation logic (30-60 min limit, no payment check) and navigation (direct URL redirect).

```plantuml
@startuml
title Reserve and Navigate - Actual Implementation

|User|
start
:Select Station on Map;
:Click "Reserve";

|Front-End|
:Prompt for Duration (default 30 min);
:Send POST /api/reserve/:id/:minutes;

|Back-End|
:Validate User ID (from Token);
:Check Point Existence;
:Check if Point is already Reserved;

if (Available?) then (yes)
  :Update Point status = 'reserved';
  :Set reservationendtime (Now + Minutes);
  :Create 'Reservation' Record in DB;
  :Return Success & Expiry Time;
  
  |Front-End|
  :Show "Reserved" Confirmation;
  :Show Timer/Expiry;
else (no)
  :Return Conflict/Error;
  |Front-End|
  :Show "Station already reserved";
endif

|User|
if (Click "Navigate"?) then (yes)
  |Front-End|
  :Request Navigation;
  :Window.open /api/navigate/:pointId; 
  
  |Back-End|
  :GET /api/navigate/:pointId;
  :Lookup Point Coordinates (Lat, Lon);
  :Construct Google Maps URL;
  :Return HTTP 302 Redirect;
  
  |Google Maps|
  :Open Route to Destination;
else (no)
endif

stop
@enduml
```

## 5. Use Case 4: History & Statistics
Reflects the actual implementation: Users can view their "Reservations" (User History). "Charging Sessions" (Energy/Cost) are not directly linked to User View in the current API (Sessions endpoint is for admin/operator or requires point linkage).

```plantuml
@startuml
title View History (My Reservations) - Actual Implementation

|User|
start
:Access "My Reservations" / History;

|Front-End|
:Call GET /api/myreservations;
:Send Auth Token;

|Back-End|
:Validate Token -> Get User ID;
:Query 'Reservations' collection by user_id;
:Sort by Start Time (Desc);
:Fetch related Point details (Name, Address);
:Return List of Reservations;

|Front-End|
if (Data received?) then (yes)
  :Render List of Reservations;
  :Show Status, Date, Station Name;
else (no data)
  :Show "No reservations found";
endif

note right
  Actual "Charging Statistics" (Energy/Cost) 
  are not provided in this view.
  Only Reservation history is available.
end note

stop
@enduml
```

## 6. Database ER Diagram (Actual Mongoose Schema)
Reflects the schemas defined in `models/`.

```plantuml
@startuml WattApp_ER_Actual

!define PRIMARY_KEY(x) <b><u>x</u></b>
!define FOREIGN_KEY(x) <i>x</i>

title WattApp - Entity Relationship Diagram (Actual Implementation)

skinparam linetype ortho
skinparam roundcorner 10
skinparam shadowing false

entity "User" as user {
    PRIMARY_KEY(_id) : ObjectId
    --
    email : String
    password_hash : String
    first_name : String
    last_name : String
    phone : String
    role : Enum [admin, operator, customer]
    status : Enum [active, inactive, suspended]
    payment_methods : Array<Mixed>
    preferences : Array<Mixed>
    vehicle_info : Array<Mixed>
    activeReservation : ObjectId (Ref: Reservation)
    failed_login_attempts : Number
    last_login : Date
}

entity "Point" as point {
    PRIMARY_KEY(_id) : ObjectId (Implicit)
    pointid : Number (Indexed)
    --
    providerName : String
    station_name : String
    status : Enum [available, reserved, ...]
    lat : Number
    lon : Number
    cap : Number (Power)
    connector_type : String
    kwhprice : Number
    reservationendtime : Date
    reservedBy : ObjectId (Ref: User)
    lastStatusChange : Date
}

entity "Reservation" as reservation {
    PRIMARY_KEY(_id) : ObjectId
    --
    FOREIGN_KEY(user_id) : ObjectId (Ref: User)
    pointid : Number
    status : Enum [active, expired, cancelled]
    start_time : Date
    end_time : Date
    duration_minutes : Number
    reservation_fee : Number
    FOREIGN_KEY(charging_session_id) : ObjectId
}

entity "ChargingSession" as session {
    PRIMARY_KEY(_id) : ObjectId
    --
    FOREIGN_KEY(user_id) : ObjectId (Ref: User)
    station_id : String
    pointid : Number
    FOREIGN_KEY(reservation_id) : ObjectId (Ref: Reservation)
    status : Enum [pending, completed, ...]
    start_time : Date
    end_time : Date
    energy_delivered_kwh : Number
    cost : Object {energy_cost, total, currency}
    payment : Object {payment_status, ...}
    vehicle_info : Object {battery_level_start, ...}
}

entity "AuthSession" as auth {
    PRIMARY_KEY(_id) : ObjectId
    --
    FOREIGN_KEY(user_id) : ObjectId (Ref: User)
    token_id : String
    userAgent : String
    ipAddress : String
    createdAt : Date
    expiresAt : Date
    is_valid : Boolean
}

user ||--o{ reservation : "makes"
user ||--o{ session : "has"
user ||--o{ auth : "logs in"

point ||--o{ reservation : "has"
point ||--o{ session : "records"

reservation |o--o| session : "linked to"

note bottom of point
  "Point" represents a specific outlet/charger 
  and contains station info (denormalized).
end note

@enduml
```
