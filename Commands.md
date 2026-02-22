Data sourcing command:
python get_f1_data.py

Run model command:
python train_engine.py

test backend command:
python test_ws.py

Backend Commands:
1. To install required python packages
pip install -r requirements.text 

2. to start backend server
python main.py

Frontend Commands:
1. To start the UI server
npm run dev

Access Points:
1. Frontend
    http://localhost:3000/ => shows judge UI
    http://localhost:3000/ipad => shows the control panel on ipad
2. Backend
    http://localhost:8000/ws/chaos => webhook which get triggered upon receiving even from ipad, upon trigger sends data to judge UI
