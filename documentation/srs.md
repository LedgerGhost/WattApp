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

#### 3.1.1 Use case 1: Reserve and Navigate to Charger
The user logs into the web app, selects an available charger, and optionally reserves it for a specific duration.
After reserving, the user can choose to open navigation to that charger via an external service (e.g., Google Maps).
The system validates reservation rules, records the booking, and provides navigation options.
##### 3.1.1.1 Roles involved

-User : selects and optionally reserves a charger, initiates navigation

-Charging Provider System : manages charger availability, reservations, and navigation linking

-Navigation Service : external service used for route guidance

##### 3.1.1.2 Preconditions
-The provider’s charging network and backend services are operational.

-The user has installed and can access the provider’s web or mobile application.

-At least one physical charger is online and functional.

##### 3.1.1.3 Execution enviroment
<!--[ 
    - Web frontend, smartphone ui, api execution context
    - For user interfaces: add wireframes as plantuml/salt, mermaid.js/"user journey", or D2        
]-->
-User interfaces: Web frontend and mobile app (guest browsing and logged-in actions).

-Backend REST API: Manages authentication, reservations, and integration with Google Maps deep links

-Database system: Stores charger data and reservation records

-External service: Google Maps for routing

##### 3.1.1.4 Input data
- user_id: UUID — Unique identifier of the logged-in user 
- charger_id: UUID — Identifier of the selected charger
- outlet_id: UUID — Specific connector selected by the user
- reservation_duration: INTEGER  — Duration of reservation in minutes 
- reservation_start_time: DATETIME 
- navigation_choice: BOOLEAN — Whether the user wants to open navigation

##### 3.1.1.5 Expected behaviour

###### Main flow
<img width="851" height="1065" alt="reserve-navigate puml" src="https://github.com/user-attachments/assets/3098653f-66dc-46c4-82cc-621b8f6b21d6" />


###### Alternate flows
*Skip reservation* 
In this alternate flow, the user chooses not to reserve the charger and proceeds directly to navigation. After selecting an available charger from the map, the user skips the reservation step and is immediately presented with the option to open external navigation guidance. The system then generates a Google Maps deep link using the charger’s coordinates and redirects the user to the navigation application without creating a reservation record.
<img width="582" height="608" alt="skipreservation puml" src="https://github.com/user-attachments/assets/e3f542fe-b5c0-40b3-b97b-7364bd9f9db0" />


##### 3.1.1.6 Output data and postconditions
*Output data*
-reservation_record: Object
• reservation_id: UUID — Unique identifier of reservation
• user_id: UUID — User who reserved
• charger_id: UUID — Reserved charger
• start_time: DATETIME — Reservation start time
• end_time: DATETIME — Expiration time
• status: ENUM {"Active", "Expired", "Cancelled"}

-navigation_action: Object
• user_id: UUID — User initiating navigation
• charger_id: UUID — Destination charger
• maps_link: STRING — Generated Google Maps deep link
• timestamp: DATETIME — Time navigation link was opened

*Postconditions*

-Reservation is recorded in the database if selected.
-The user is redirected to Google Maps for navigation (if chosen).
-Charger status updates to Reserved for the reservation duration.
-The user can view the reservation details in their account.

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




