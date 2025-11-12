### Software Requirements Specification (SRS) template 2025

# [your app name goes here]
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
<!-- - reservation_id: UUID — Existing reservation ID, if applicable --> 
- reservation_duration: INTEGER  — Duration of reservation in minutes
- reservation_start_time: DATETIME 
- reservation_expiration_time: DATETIME — Reservation end time, max 60 minutes later 
- timestamp: DATETIME — Charging session start time 
- pre_auth_amount: DECIMAL — Amount pre-authorized for charging 
- energy_rate: DECIMAL — Price per kWh 
- payment_method_type: ENUM-{"card","google_pay","apple_pay","paypal"}
-payment_token:STRING - Authorization token from payment provider

##### 3.1.1.5 Expected behaviour

###### Main flow

![Charging diagram](http://cdn-0.plantuml.com/plantuml/png/bPM_Rjim4CPtFSKXapq4wDJ17fhKwTQWGOoayrdwR1EcIFL8sL3XgLlVesEVgazIaHGDkGuITB8iV_VT7_wEld6UnRUrBevF3d8iulTYzgM18MuQia87h9poc1UpPuK3yPwLvfK6bLkM3SGHcueQKQKoctcXrZJvR3Ua37bBN9QsDVx3bFmMXYOTtBGWcbqevk7j4XgbpyRXLN2xvnr8u21xzigQVytwm4_6GyOQgbf93vC_Ft_H-tTKApETH_LnsJcF-fX2drchYZroOqehtyMMiiKy2HU281id4PHMgk7tUvPTBftOqTLZLAAwIe9XmaIfgmMR4lhLle9h2A8oQjrO73p7pMJz7JJEguoz29otSjvajXWL1bEfTVy4xK0JOuVnFeWjWOeEoczjwy_ho56ZcCkJVCiaMHIpMn6r1_4eTBQmnWIpFRQgr074HtnhuNp09mARn16_qpnE1vkTWjItYTOsJ9NRlX1HtsC98zU6kngc_nHSdsbe4kAkAwoLGKLS1t2d2Vc7GHosHkmUrGNooxDAoS6vONw21km7YgnHtWh1G3OTLT1g3q55aztNxJGMNrhdUwn__EvJPveY9ixRnfqol8ZJifUS55IpQLdh4mah0Uz686JtZ-mzfADrg_NRjc6mjcQlok1DazKeUlfMgZp7OReau7ABwl-pQbMhK_WhQTFmwR1L6lrMPZTbg16x4RXqUWlMPQi3Jjvwrl4G4jQGjPMQUYPOPtQ6dTDW1sfDwr3rxPlAnP2dvYKklQMhstovnZiZD2Z8f4JFxDyRS98W4c7MIkhnkfTGZG-U0Tdv-NBUATTexavc4B52DPpZ3O9hlX7YqjQDZoR1JE2b8vjlfBotIP_-82wBoVMxjgvPUjW2fyLD7zhM-Yy0)
<!--
![c](test.jpg)
--->


###### Alternate flows
*Payment pre-authorization fails* 
![Charging diagram](http://cdn-0.plantuml.com/plantuml/png/NKz1JiD03Bpx5LPFwO4FD0SgmOrB1E819faqAsrs5zif2ihZILD4HKyZptZ6uwEvg4zZfENTe0jjCnrUyJd1d3tpnd0xY9v2EjL4ozjiZd6vRHMPHwGL5Gyo-P0rV8k7d6eAFLVDFSrIYkOpkiSz-u34LSfxOZuy1ojHPePgLjurlxd_pRs4Y6vNNmnFabh4ltQirqQRzWAKgm9bEQyk-OYuIEQv4AA1gncsNMuqjq37Ny67Mvp1R7i3gGiz7LUOnlW3)

*Reservation expired*
![Charging diagram](http://cdn-0.plantuml.com/plantuml/png/NP2nRiCm34HtVWMHAVa5UsW2xnrIz0COcOw9qb8WqMuD-EFBoXsQBj89zt0utRaOPPidXUszSDwWlg6vv2mB8nc6aVATCz9WVcPsQY6J596_7fAhR06sjxKOJniqtSZXumbSIAKNMrkG0O_NFqunKTtzbnFQo16FCPq0iUae1jQd79ejJIu3gNgOGw_9P5XnTWOFr__Tk3zKgllzmer3chWWBIHADsMqXCb6pkM7AvOUm5eOZokNMkAYcZxtU4VhDliW4kyjSEnbWBDVFk0t)

##### 3.1.1.6 Output data and postconditions
*Output data*
- Charging_session: Object  
  Description: New record representing the charging event.  
  Attributes:
    • session_id: UUID — Unique identifier of the charging session 
    • user_id: UUID — User who performed the charging  
    • charger_id: UUID — Charger used  
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
    • payment_method_type: ENUM — {"card", "apple_pay" "google_pay", "paypal"}  
    • status: ENUM — {"Authorized", "Completed", "Failed"}  
    • timestamp: DATETIME — Time of final payment completion

- Charger_state: Object (updated)  
  Description: The charger’s operational status is updated after the session.  
  Attributes:
    • charger_id: UUID — Charger identifier  
    • status: ENUM — {"Available", "Reserved", "Charging", "Error"}  
    • last_update: DATETIME — Time of last status change

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
-The charger returns to Available state.
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




