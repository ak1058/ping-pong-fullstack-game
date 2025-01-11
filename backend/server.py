from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import random
import asyncio

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

rooms = {}
game_states = {}

@app.route('/')
def index():
    return "Ping Pong Game Backend"

def generate_random_position(exclude_positions=[]):
    while True:
        x = random.randint(100, 400)
        y = random.randint(100, 300)
        if (x, y) not in exclude_positions:
            return x, y

@socketio.on('createRoom')
def create_room(room_code):
    if room_code not in rooms:
        rooms[room_code] = {'user1_sid': request.sid, 'user2_sid': None}
        emit('roomCreated', {'roomCode': room_code}, room=request.sid)
    else:
        emit('roomExists', {'message': 'Room already exists'}, room=request.sid)

@socketio.on('joinRoom')
def join_room(room_code):
    room_code = int(room_code)
    if room_code in rooms:
        room = rooms[room_code]
        if room['user2_sid'] is None:
            room['user2_sid'] = request.sid
            obstacle1_x, obstacle1_y = generate_random_position([])
            obstacle2_x, obstacle2_y = generate_random_position([(obstacle1_x, obstacle1_y)])
            game_states[room_code] = {
                'user1': {'paddleY': 150, 'score': 0},
                'user2': {'paddleY': 150, 'score': 0},
                'ball': {'x': 250, 'y': 200, 'dx': 2, 'dy': 2},
                'obstacles': [(obstacle1_x, obstacle1_y), (obstacle2_x, obstacle2_y)]
            }
            emit('bothPlayersConnected', {
                'message': 'Both players connected! Game will start in 5 seconds...',
                'roomCode': room_code,
                'user1': room['user1_sid'],
                'user2': room['user2_sid']
            }, to=room['user1_sid'])
            emit('bothPlayersConnected', {
                'message': 'Both players connected! Game will start in 5 seconds...',
                'roomCode': room_code,
                'user1': room['user1_sid'],
                'user2': room['user2_sid']
            }, to=room['user2_sid'])
            emit('gameStart', {'message': 'Game is starting...'}, to=room['user1_sid'])
            emit('gameStart', {'message': 'Game is starting...'}, to=room['user2_sid'])
        else:
            emit('roomFull', {'message': 'Room is full!'}, room=request.sid)
    else:
        emit('invalidRoom', {'message': 'Room not found or already started.'}, room=request.sid)

@socketio.on('movePaddle')
def move_paddle(data):
    print("moving paddle")
    room_code = int(data['roomCode'])
    user = data['user']
    userid = data['userid']
    new_position = data['position']
    print("new_position:",new_position)
    print("type:",type(room_code))
    print("game_states:",game_states)
    if room_code in game_states:
        game_state = game_states[room_code]
        room = rooms[room_code]
        print("Room exists")
        print(user,"userrrr")
        if user == 'User1':
            game_state['user1']['paddleY'] = new_position
        elif user == 'User2':
            game_state['user2']['paddleY'] = new_position
        
        if rooms[room_code]['user1_sid']:
            emit('paddleUpdate', {'user': userid, 'position': new_position},to=room['user1_sid'])
            print("sent for 1", room['user1_sid'])
        else:
            print("No")
        if rooms[room_code]['user2_sid']:
            emit('paddleUpdate', {'user': userid, 'position': new_position},to=room['user2_sid'])
            print("sent for 2", room['user2_sid'])
        else:
            print("No2")
    else:
        print("Room does not exist")

def move_ball(room_code):
    room_code = int(room_code)
    room = rooms[room_code]
    game_state = game_states[room_code]
    ball = game_state['ball']
    obstacles = game_state['obstacles']
    ball['x'] += ball['dx']
    ball['y'] += ball['dy']

    if ball['y'] <= 0 or ball['y'] >= 400:
        ball['dy'] = -ball['dy']

    if ball['x'] <= 30 and ball['y'] >= game_state['user1']['paddleY'] and ball['y'] <= game_state['user1']['paddleY'] + 60:
        ball['dx'] = -ball['dx']
        ball['dy'] += random.choice([-1, 1])

    if ball['x'] >= 470 and ball['y'] >= game_state['user2']['paddleY'] and ball['y'] <= game_state['user2']['paddleY'] + 60:
        ball['dx'] = -ball['dx']
        ball['dy'] += random.choice([-1, 1])

    for (obstacle_x, obstacle_y) in obstacles:
        if ball['x'] >= obstacle_x and ball['x'] <= obstacle_x + 20 and ball['y'] >= obstacle_y and ball['y'] <= obstacle_y + 20:
            ball['dx'] = -ball['dx']

    if ball['x'] <= 0:
        game_state['user2']['score'] += 1
        ball['x'] = 250
        ball['y'] = 200
        ball['dx'] = random.choice([-2, 2])
        ball['dy'] = random.choice([-2, 2])
        socketio.emit('scoreUpdate', {'score1': game_state['user1']['score'], 'score2': game_state['user2']['score']}, to=room['user1_sid'])
        socketio.emit('scoreUpdate', {'score1': game_state['user1']['score'], 'score2': game_state['user2']['score']}, to=room['user2_sid'])
    elif ball['x'] >= 500:
        game_state['user1']['score'] += 1
        ball['x'] = 250
        ball['y'] = 200
        ball['dx'] = random.choice([-2, 2])
        ball['dy'] = random.choice([-2, 2])

        socketio.emit('scoreUpdate', {'score1': game_state['user1']['score'], 'score2': game_state['user2']['score']}, to=room['user1_sid'])
        socketio.emit('scoreUpdate', {'score1': game_state['user1']['score'], 'score2': game_state['user2']['score']}, to=room['user2_sid'])

    socketio.emit('obstaclesUpdate', {'obstacles': game_state['obstacles']}, to=room['user1_sid'])
    socketio.emit('obstaclesUpdate', {'obstacles': game_state['obstacles']}, to=room['user2_sid'])

    socketio.emit('ballUpdate', {'x': ball['x'], 'y': ball['y']}, to=room['user1_sid'])
    socketio.emit('ballUpdate', {'x': ball['x'], 'y': ball['y']}, to=room['user2_sid'])

@socketio.on('startGame')
def startGame(room_code):
    def game_loop():
        while True:
            move_ball(room_code)
            socketio.sleep(0.05)
    socketio.start_background_task(target=game_loop)

if __name__ == '__main__':
    socketio.run(app, debug=True)
