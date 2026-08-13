export function RoomSelection({ setUsername, setRoomId }) {

  const createRoom = () => {
    const username = document.getElementById('username').value.trim()

    if (!username) {
      alert('Please enter a username')
      return
    }

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setUsername(username)
    setRoomId(roomId)
    window.history.pushState({}, '', `?username=${username}&roomId=${roomId}&host=true&hostUser=${username}`)
  }

  const joinRoom = () => {
    const username = document.getElementById('username').value.trim()
    const roomId = document.getElementById('roomId').value.trim().toUpperCase()

    if (!username || !roomId) {
      alert('Please enter both username and room code')
      return
    }

    setUsername(username)
    setRoomId(roomId)
    window.history.pushState({}, '', `?username=${username}&roomId=${roomId}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const roomId = document.getElementById('roomId').value.trim()
      roomId ? joinRoom() : createRoom()
    }
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        {/* Logo / Header */}
        <div className="text-center mb-10">
          <img
            src="/MergePad_logo.png"
            alt="MergePad Logo"
            className="w-56 mx-auto mb-2"
            style={{ mixBlendMode: "screen" }}
          />
          <p className="text-gray-400 text-sm">Real-time collaborative code editor</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">

          {/* Username */}
          <div className="mb-6">
            <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Your Name
            </label>
            <input
              id="username"
              placeholder="e.g. Shwet"
              onKeyDown={handleKeyDown}
              className="w-full bg-gray-800 text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          {/* Create Room */}
          <button
            onClick={createRoom}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm mb-4"
          >
            + Create New Room
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">or join existing</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Room Code + Join */}
          <div className="flex gap-2">
            <input
              id="roomId"
              placeholder="Room code"
              onKeyDown={handleKeyDown}
              defaultValue={new URLSearchParams(window.location.search).get('roomId') || ''}
              className="flex-1 bg-gray-800 text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-green-500 transition-colors text-sm font-mono tracking-widest uppercase"
            />
            <button
              onClick={joinRoom}
              className="bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
            >
              Join
            </button>
          </div>

        </div>

        {/* Footer note */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Share the room code with collaborators to code together
        </p>

      </div>

    </main>
  )
}