import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';
import './App.css'; 
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import GameScreen from "./GameScreen";
const socket = socketIOClient("http://localhost:5000"); 


const App = () => {
  const [roomCode, setRoomCode] = useState('');
  const [player, setPlayer] = useState('');
  const [gameStatus, setGameStatus] = useState('');
  const [roomStatus, setRoomStatus] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [waitingMessage, setWaitingMessage] = useState('');
  const [user1, setUser1] = useState(null);
  const [user2, setUser2] = useState(null);
  const navigate = useNavigate();

  
  useEffect(() => {
    socket.on('roomCreated', (data) => {
      setRoomCode(data.roomCode); 
      setRoomStatus('Waiting for other player...');
    });

    socket.on('bothPlayersConnected', (data) => {
      console.log('Both players connected:', data);
      setWaitingMessage(data.message);
      setUser1(data.user1); 
      setUser2(data.user2); 
      setRoomStatus(''); 
      
    console.log('Both players connected, roomCode:', data.roomCode); 
    console.log('User 1:', data.user1);
    console.log('User 2:', data.user2);
      setTimeout(() => {
        navigate("/game", { state: { roomCode: data.roomCode, user1: data.user1, user2: data.user2 } });  
      }, 500);
    });

    socket.on('gameStart', (data) => {
      setGameStatus(data.message); 
      setRoomStatus(''); 
    });

    socket.on('invalidRoom', (data) => {
      alert(data.message); 
    });

    socket.on('roomFull', (data) => {
      alert(data.message); 
    });

    
    return () => {
      socket.off();
    };
  }, [navigate]);

  // Create a new room
  const createRoom = () => {
    const newRoomCode = Math.floor(Math.random() * 10000); 
    socket.emit('createRoom', newRoomCode); 
    setPlayer('Player 1');
    setRoomStatus('Waiting for other player...');
  };

  // Join an existing room
  const joinRoom = (code) => {
    socket.emit('joinRoom', code); 
    setRoomInput('');
    setPlayer('Player 2');
    setRoomStatus('Joining room...');
  };

  return (
    <div className="App">
  <h1>Ping Pong Game</h1>
  <div className="game-container">
    <img src="/ping.jpeg" alt="Ping Pong Game" className="game-image" />
    <button onClick={createRoom}>Start Game</button>
    <input
      type="number"
      value={roomInput}
      placeholder="Enter Room Code"
      onChange={(e) => setRoomInput(e.target.value)}
    />
    <button onClick={() => joinRoom(roomInput)}>Join Room</button>
  </div>
  
  {roomStatus && <p>{roomStatus}</p>}
  {player === 'Player 1' && <p>Your Room Code: {roomCode}</p>}
  {waitingMessage && (
    <div>
      <p>{waitingMessage}</p>
      <p>Player 1: {user1}</p>
      <p>Player 2: {user2}</p>
    </div>
  )}
  {gameStatus && <p>{gameStatus}</p>}
</div>

  );
};

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/game" element={<GameScreen socket={socket}  />} />
        
      </Routes>
    </Router>
  );
}
