# Run sfsp-api
wt -w 0 nt -p "PowerShell" powershell -NoExit -Command "cd sfsp-api; node ."

# Run fileService
wt -w 0 nt -p "PowerShell" powershell -NoExit -Command "cd sfsp-api\services\fileService; go run main.go"

# Run keyservice
wt -w 0 nt -p "PowerShell" powershell -NoExit -Command "cd sfsp-api\services\keyservice; python app.py"

# Run sfsp-ui
wt -w 0 nt -p "PowerShell" powershell -NoExit -Command "cd sfsp-ui; npm run dev"

