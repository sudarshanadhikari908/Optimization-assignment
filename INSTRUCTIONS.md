# PortPro Assignment

## Prerequisites

- Mongodb: >=5
- Node version: 18

## Instructions

1. Import data/database/db.data.json into chargetemplates collection in MongoDB
2. Run the project with data/input/curl1.data.txt, observe the output
3. Run the project with data/input/curl2.data.txt, observe the output
4. Optimize/Fix the code such that curl2's output is same as curl1.data.txt. Make sure that no changes are made to the input curl request
5. After assignment has been done, create a report that explains the following:
    - What is the code doing and what do you think this is used for?
    I think the whole code is trying to get the details of the courier the is to be received or sent and the overall details of the customer that is receiving , who is taking the courier to the home and the details of the courier itself 
    - What was the issue?
        -> The issue is about the Javascript heap out of memory causing due to multiple for loops and the recursion 
    - How was the issue identified?
        -> I checked the memory usage and saw huge memory spike and dubugged by adding multiple console log statements and I tried to learn what every of these functions are returning. 
    - What are the steps taken to fix the issue?
        -> First I tried to understand the scemha of the database to get more overview about what I am doing, why is the data being used for and then I tried to understand the flow of the code and where is the code breaking by adding console logs and then I googled and used my own experience as well to optimize the existing code which still takes some time but atleast its giving me result for curl 2 
    - Zip the solution and email back to PortPro.
