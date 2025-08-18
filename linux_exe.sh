#!/bin/bash
alias opentab='gnome-terminal --tab'


# Tab 1: Run sfsp-api (Node.js)
gnome-terminal --tab --title="sfsp-api" -- bash -c "cd sfsp-api && npm install && node .; exec bash"

# Tab 2: Run fileService (Go)
gnome-terminal --tab --title="fileService" -- bash -c "cd sfsp-api/services/fileService && go run main.go; exec bash"

# Tab 3: Run keyservice (Python)
gnome-terminal --tab --title="keyservice" -- bash -c "cd sfsp-api/services/keyservice && python3 app.py; exec bash"

# Tab 4: Run sfsp-ui (Frontend)
gnome-terminal --tab --title="sfsp-ui" -- bash -c "cd sfsp-ui && npm install && npm run dev; exec bash"

