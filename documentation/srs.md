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

#### 3.1.1 Use case 1: [title]
[  
    - short description of the use case    
]
##### 3.1.1.1 Roles involved
[  
    - roles     
]
##### 3.1.1.2 Preconditions
[  
    - prerequisites of any kind, out of the use case scope       
]
##### 3.1.1.3 Execution enviroment
[  
    - Web frontend, smartphone ui, api execution context
    - For user interfaces: add wireframes as plantuml/salt, mermaid.js/"user journey", or D2        
]
##### 3.1.1.4 Input data
[  
    - user input, or input for other sources, if applicable         
]
##### 3.1.1.5 Expected behaviour

###### Main flow
[  
    - UML activity diagram        
]
###### Alternate flows
[  
    - UML activity diagrams        
]

##### 3.1.1.6 Output data and postconditions
[  
    - data elements produced by the use case         
]

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


