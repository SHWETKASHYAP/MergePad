export function RoomSelection({ setUsername, setRoomId }) {

  const createRoom = () => {
    const username = document.getElementById('username').value

    if (!username) {
      alert('Please enter a username')
      return
    }

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

    setUsername(username)
    setRoomId(roomId)

    window.history.pushState(
      {},
      '',
      `?username=${username}&roomId=${roomId}&host=true&hostUser=${username}`
    )
  }

  const joinRoom = () => {
    const username = document.getElementById('username').value
    const roomId = document.getElementById('roomId').value

    if (!username || !roomId) {
      alert('Please enter both username and room ID')
      return
    }

    setUsername(username)
    setRoomId(roomId)

    window.history.pushState({}, '', `?username=${username}&roomId=${roomId}`)
  }

  return (
    <main className="h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-lg flex flex-col gap-4 w-96">

        <h1 className="text-3xl text-white text-center">MergePad</h1>

        <input
          id="username"
          placeholder="Username"
          className="p-2 rounded bg-gray-800 text-white"
        />

        <button
          onClick={createRoom}
          className="bg-green-600 p-2 rounded text-white"
        >
          Create Room
        </button>

        <input
          id="roomId"
          defaultValue={
            new URLSearchParams(window.location.search).get('roomId') || ''
          }
          placeholder="Room Code"
          className="p-2 rounded bg-gray-800 text-white"
        />

        <button
          onClick={joinRoom}
          className="bg-blue-600 p-2 rounded text-white"
        >
          Join Room
        </button>

      </div>
    </main>
  )
}
