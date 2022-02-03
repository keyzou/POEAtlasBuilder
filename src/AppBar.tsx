import { faWindowMaximize, faWindowMinimize, faWindowRestore, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';

import Icon from './assets/icons/Icon-Electron.png';

function AppBar() {
  const [isMaximize, setMaximize] = useState(false);

  const handleToggle = () => {
    if (isMaximize) {
      setMaximize(false);
    } else {
      setMaximize(true);
    }
    window.Main.Maximize();
  };

  return (
    <div className="absolute w-full z-50 pl-3 h-8 bg-zinc-900 text-gray-300 flex items-stretch justify-between draggable">
      <div className="flex items-center">
        <img className="h-6 mr-1" src={Icon} alt="Icon of Electron" />
        <p className="text-sm font-bold text-zinc-400">POE Atlas Builder</p>
      </div>
      <div className="inline-flex -mt-1">
        <button onClick={window.Main.Minimize} className="undraggable px-4 hover:bg-gray-700 hover:text-white">
          <FontAwesomeIcon icon={faWindowMinimize} />
        </button>
        <button onClick={handleToggle} className="undraggable px-6 lg:px-5 pt-1 hover:bg-gray-700">
          {isMaximize ? <FontAwesomeIcon icon={faWindowRestore} /> : <FontAwesomeIcon icon={faWindowMaximize} />}
        </button>
        <button onClick={window.Main.Close} className="undraggable px-4 pt-1 hover:bg-red-500 hover:text-white">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );
}

export default AppBar;
