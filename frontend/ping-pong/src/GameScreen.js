import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const GameScreen = ({ socket }) => {
  const { state } = useLocation();
  const { roomCode, user1, user2 } = state;

  const canvasRef = useRef(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [paddle1Pos, setPaddle1Pos] = useState(150);
  const [paddle2Pos, setPaddle2Pos] = useState(150);
  const [ball, setBall] = useState({ x: 250, y: 200, dx: 2, dy: 2 });
  const [obstacles, setObstacles] = useState([]);

  useEffect(() => {
    socket.on('paddleUpdate', (data) => {
      if (data.user === user1) {
        setPaddle1Pos(data.position);
      } else if (data.user === user2) {
        setPaddle2Pos(data.position);
      }
    });

    socket.on('scoreUpdate', (data) => {
      setScore1(data.score1);
      setScore2(data.score2);
    });

    socket.on('ballUpdate', (data) => {
      setBall({ ...ball, x: data.x, y: data.y });
    });
    socket.on('obstaclesUpdate', (data) => {
      setObstacles(data.obstacles);
    });

    socket.emit('startGame', roomCode);

    return () => {
      socket.off('paddleUpdate');
      socket.off('scoreUpdate');
      socket.off('ballUpdate');
      socket.off('obstaclesUpdate');
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'w') {
      movePaddle(user1, -10);
    } else if (e.key === 's') {
      movePaddle(user1, 10);
    } else if (e.key === 'ArrowUp') {
      movePaddle(user2, -10);
    } else if (e.key === 'ArrowDown') {
      movePaddle(user2, 10);
    }
  };

  const movePaddle = (user, direction) => {
    let newPosition;
    if (user === user1) {
      newPosition = Math.max(0, Math.min(300, paddle1Pos + direction)); 
      socket.emit('movePaddle', { user: "User1", userid: user1, position: newPosition, roomCode: roomCode });
      setPaddle1Pos(newPosition);
    } else if (user === user2) {
      newPosition = Math.max(0, Math.min(300, paddle2Pos + direction)); 
      socket.emit('movePaddle', { user: "User2", userid: user2, position: newPosition, roomCode: roomCode });
      setPaddle2Pos(newPosition);
    }
  };

  const drawGame = (context) => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    context.fillStyle = 'blue';
    context.fillRect(20, paddle1Pos, 10, 60);
    context.fillRect(470, paddle2Pos, 10, 60);

    context.fillStyle = 'red';
    context.beginPath();
    context.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = 'green';
    obstacles.forEach((obstacle) => {
      context.fillRect(obstacle[0], obstacle[1], 20, 20);
    });

    context.font = '20px Arial';
    context.fillStyle = 'black';
    context.fillText(`User 1: ${score1}`, 20, 30);
    context.fillText(`User 2: ${score2}`, 370, 30);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    drawGame(context);

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [paddle1Pos, paddle2Pos, ball, score1, score2]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
      }}
    >
      <h1>Ping Pong Game</h1>
      <div>
        <h3>Score:</h3>
        <p>User 1: {score1} - User 2: {score2}</p>
      </div>
      <canvas
        ref={canvasRef}
        width="500"
        height="400"
        style={{ border: '2px solid black' }}
      />
    </div>
  );
};

export default GameScreen;
