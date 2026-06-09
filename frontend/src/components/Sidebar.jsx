export function Sidebar({ users, roomId }) {
  const copyRoomCode = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}?roomId=${roomId}`
    )
    alert('Room code copied!')
  }

  return (
    <aside className="h-full w-1/4 bg-gray-400 rounded-lg">

      <div className="p-4 border-b border-gray-300">
        <h2 className="text-xl font-bold">Active Users</h2>

        <div className="mt-3 text-sm">
          <span className="font-semibold">Room:</span> {roomId}
        </div>

        <button
          onClick={copyRoomCode}
          className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Copy Room Code
        </button>
      </div>

      <ul className="p-4">
        {users.map((user, index) => (
          <li
            key={index}
            className="p-2 rounded mb-2 text-white flex justify-between items-center"
            style={{ backgroundColor: user.color }}
          >
            <span>{user.username}</span>
            {user.isHost && <span title="Room Creator">👑</span>}
          </li>
        ))}
      </ul>

    </aside>
  )
}
