### Software Requirements Specification (SRS) template 2025

# WattApp
# Software Requirements Specification Document
_NOTE: text [in brakets] must not appear in the final SRS document_ 
## 1. Introduction 

### 1.1 Purpose
[  
    - Purpose statement  
    - Stakeholders  
    - System block diagram as plantuml code (no architecture!)  
]  

### 1.2 Interfaces

#### 1.2.1 Interfaces to external systems
[  
    - Identification of external systems that interface with our software  
    - Applicable standards and protocols (if any) 
    - UML component diagram as plantuml code showing interfaces   
]     
#### 1.2.2 User Interfaces
[  
    - Use wireframes or any image-based description of UI elements  
    - Use plantuml/salt, mermaid.js/"user journey", or D2  
    - Flow between screens, etc.  
    - No aesthetic details needed  
]   

## 2. References
[  
    - Links to information sources.  
    - Glossary of terms  
]
## 3. Software requirements
[  
    - The top-level use-case diagram  
    - Short mention to the use case model structure    
]
### 3.1 Use cases

#### 3.1.1 Use case 1: Charge Electric Vehicle
The electric vehicle user logs in and initiates a charging session for their vehicle. The user may optionally reserve a charger beforehand. When charging begins, the system pre-authorizes a payment amount, monitors the session, and automatically finalizes payment when charging ends.
##### 3.1.1.1 Roles involved

-User : can reserve chargers, start and stop charging, and perform payments

-Charging Provider System : manages charger status, reservations, and charging sessions

-Payment Service Provider : handles pre-authorizations and transactions

##### 3.1.1.2 Preconditions
-The provider’s charging network and backend services are operational.
-The user has installed and can access the provider’s web or mobile application.
-A valid connection to the payment service exists.
-At least one physical charger is online and functional.


##### 3.1.1.3 Execution enviroment
<!--[ 
    - Web frontend, smartphone ui, api execution context
    - For user interfaces: add wireframes as plantuml/salt, mermaid.js/"user journey", or D2        
]-->
-User interfaces: Web frontend and mobile app (guest browsing and logged-in actions).
-Backend REST API: Handles authentication, charger management, reservations, and sessions.
-Payment API: Handles pre-authorization and settlement.
-Database system: Stores user profiles, charger data, sessions, and payments

##### 3.1.1.4 Input data
- user_id: UUID — Unique identifier of the logged-in user 
- charger_id: UUID — Identifier of the selected charger
- outlet_id: UUID — Specific connector selected by the user
- reservation_duration: INTEGER  — Duration of reservation in minutes 
- reservation_start_time: DATETIME 
- pre_auth_amount: DECIMAL — Amount pre-authorized for charging 
- payment_method_type: ENUM-{"card","google_pay","apple_pay","paypal"}
-payment_token:STRING - Authorization token from payment provider
 <!---- timestamp: DATETIME — Charging session start time - reservation_expiration_time: DATETIME — Reservation end time, max 60 minutes later, calculatated by backend --> 
 <!--- - energy_rate: DECIMAL — Price per kWh , internal system value not here--> <!-- - reservation_id: UUID — Existing reservation ID, if applicable --> 
##### 3.1.1.5 Expected behaviour

###### Main flow
<img width="2143" height="4465" alt="mainflow27final" src="https://github.com/user-attachments/assets/4940f9ec-af2a-4f3a-85e2-c20f3cc9ab56" />



###### Alternate flows
*Payment pre-authorization fails* 

<img width="703" height="422" alt="payment_fail" src="https://github.com/user-attachments/assets/cb5f44c3-711e-4c7d-ba90-a7f4a6deb675" />


*Reservation expired*

<img width="761" height="446" alt="reservation_fail puml" src="https://github.com/user-attachments/assets/956e5b43-d284-47dd-8af9-ed7d6a735913" />


##### 3.1.1.6 Output data and postconditions
*Output data*
- Charging_session: Object  
  Description: New record representing the charging event.  
  Attributes:
    • session_id: UUID — Unique identifier of the charging session 
    • user_id: UUID — User who performed the charging  
    • charger_id: UUID — Charger used
    • outlet_id: UUID — Identifier of the specific connector used by the user
    • energy_consumed: DECIMAL — Energy delivered in kWh   
    • start_time: DATETIME — Charging start time  
    • end_time: DATETIME — Charging end time  
    • total_cost: DECIMAL — Final billed amount (€)  
    • payment_transaction_id: STRING — Reference to payment record  
    • status: ENUM — {"Completed", "Interrupted", "Error"}

- Payment_transaction: Object  
  Description: Created by the system when processing pre-authorization and final billing.  
  Attributes:
    • transaction_id: STRING — Payment provider reference  
    • session_id: UUID — Related charging session  
    • amount_charged: DECIMAL — Final billed amount (€)  
    • amount_released: DECIMAL — Unused pre-authorized amount
    • payment_method_type: ENUM — {"card", "apple_pay", "google_pay", "paypal"}  
    • status: ENUM — {"Authorized", "Completed", "Failed"}  
    • timestamp: DATETIME — Time of final payment completion

-Outlet_state:
  • outlet_id: UUID
  • status: ENUM {"Available", "Reserved", "Charging", "Error"}
  • last_update: DATETIME


- User_notification: Object (produced)  
  Description: Message or notification sent to the user after successful session completion.  
  Attributes:
    • message_id: UUID — Notification identifier  
    • user_id: UUID — Recipient user  
    • type: ENUM — {"Confirmation", "Receipt"}  
    • content: STRING — Text content of the message  
    • delivery_status: ENUM — {"Delivered", "Pending"}  

*Postconditions*
-Session, payment, and charger data are stored in the database.
-Payment is completed or unused funds are released.
-The outlet used for the session returns to Available state.
-The user can review the session and receipt.

##### 3.1.1.7 Notes
[  
    - everything else, if needed           
]

#### 3.1.2 Use case 2: [title]
[  
    - use the same structure as in 3.1.1.1 - 3.1.1.7  
    - repeat for all use cases    
]

## 3.2 Functional Requirements
[  
    - UML functional requirements diagram  
    - short description of each requirement    
]

## 3.3 Performance requirements
[  
    - performance requirements and justification     
]

The performance requirements PR-01 to PR-09 are based on empirical data from EV charger locations in the target region. The dataset contains approximately 545 locations, 1 021 stations, and 1 454 charging outlets. Assuming a typical update frequency of 5–10 seconds per outlet, the backend must handle approximately 150–300 real-time status updates per second. With around 8 700 charging sessions per day (≈10k sessions), reporting queries of this size should be returned within 3 seconds on a properly indexed database. Concurrent user sessions of at least 1 000 are justified by the maximum number of outlets and potential monitoring users.

| **ID** | **Requirement Description** | **Category** | **Priority** |
|:------:|-----------------------------|---------------|---------------|
| **PR‑01** | The web interface shall display charger availability or dashboard pages within **2 seconds** under normal network conditions. | Response Time | High |
| **PR‑02** | The backend API shall respond to charger status or booking requests within **500 milliseconds** for at least 95% of total requests. | API Response | High |
| **PR‑03** | The system shall support at least **1,000 concurrent user sessions** without significant degradation of performance. | Throughput | High |
| **PR‑04** | The system shall be capable of processing and storing up to **200 charging session updates per second** from connected chargers. | Real‑Time Processing | High |
| **PR‑05** | The web application shall maintain a minimum **99.9% uptime** (excluding scheduled maintenance). | Availability | High |
| **PR‑06** | System recovery after an unexpected failure shall occur automatically within **60 seconds**. | Reliability / Recovery | High |
| **PR‑07** | The architecture shall allow **horizontal scaling** (e.g., adding servers or containers) to handle at least **double the normal load** without redesign. | Scalability | Medium |
| **PR‑08** | Updates from physical chargers (status changes, session data) shall be reflected on the user dashboard within **5 seconds** of being received. | Data Freshness / Synchronization | High |
| **PR‑09** | The system shall retrieve reports or usage summaries of up to 10,000 charging sessions within **3 seconds**. | Database Query Performance | Medium |

---


## 3.4 Data requirements

### 3.4.1 Data access requirements
[  
    - sources, technologies protocols, authentication, whatever applies       
]

### 3.4.2 Semantic data model
[  
    - ER or class diagram, semantics only (no typing, constraints, etc.).        
]

## 3.5 Other requirements
[  
    - other non-functional requirements       
]

### 3.5.1 Availability
[  
    - availability requirements and justification       
]

### 3.5.2 Security
[  
    - security requirements and justification       
]




