#!/bin/bash

echo "Select terminal environment:"
echo "1) Windows PowerShell"
echo "2) VS Code Terminal"
echo "3) Linux Terminal (gnome-terminal)"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo "Opening in Windows PowerShell..."
        # Opens four PowerShell windows running each service
        powershell.exe -NoExit -Command "cd $(pwd);node .; Read-Host 'Press Enter to exit...'" &
        powershell.exe -NoExit -Command "cd $(pwd)/sfsp-api/services/fileService; go run main.go; Read-Host 'Press Enter to exit...'" &
        powershell.exe -NoExit -Command "cd $(pwd)/sfsp-api/services/keyservice; python app.py; Read-Host 'Press Enter to exit...'" &
        powershell.exe -NoExit -Command "cd $(pwd)/sfsp-ui; npm run dev; Read-Host 'Press Enter to exit...'" &
        wait
        ;;
    2)
        echo "Opening in VS Code Terminal..."
        # Opens VS Code in project folders; each terminal can run commands manually
        code -n sfsp-api
        code -n sfsp-api/services/fileService
        code -n sfsp-api/services/keyservice
        code -n sfsp-ui
        echo "Open a new terminal in each VS Code window and run the respective commands:"
        echo "sfsp-api: node ."
        echo "fileService: go run main.go"
        echo "keyservice: python app.py"
        echo "sfsp-ui:npm run dev"
        ;;
    3)
        echo "Opening in Linux gnome-terminal..."
        gnome-terminal --tab --title="sfsp-api" -- bash -c "cd sfsp-api && node .; exec bash"
        gnome-terminal --tab --title="fileService" -- bash -c "cd sfsp-api/services/fileService && go run main.go; exec bash"
        gnome-terminal --tab --title="keyservice" -- bash -c "cd sfsp-api/services/keyservice && python3 app.py; exec bash"
        gnome-terminal --tab --title="sfsp-ui" -- bash -c "cd sfsp-ui && npm run dev; exec bash"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

