import React, { useState } from 'react';
import { VscChromeClose, VscChromeMinimize, VscChromeMaximize, VscChromeRestore } from 'react-icons/vsc';

import { version } from '../package.json';

import Icon from './assets/icons/icon.png';

const AppBar = () => {
  const [isMaximize, setMaximize] = useState(false);
  const [showUpdateAvailable, setShowUpdateAvailable] = useState(false);
  const [updateContent, setUpdateContent] = useState('Update available !');

  const handleToggle = () => {
    if (isMaximize) {
      setMaximize(false);
    } else {
      setMaximize(true);
    }
    window.Main.Maximize();
  };

  React.useEffect(() => {
    window.Main.on('update-available', () => {
      setShowUpdateAvailable(true);
    });
  });

  const handleUpdateClick = () => {
    window.Main.updateApp();
  };

  return (
    <div className="absolute w-full z-50 pl-3 h-8 bg-zinc-900 text-gray-300 flex items-stretch justify-between draggable">
      <div className="flex items-center">
        <img className="h-6 mr-1" src={Icon} alt="POE Atlas Builder" />
        <p className="text-sm font-bold text-zinc-400">POE Atlas Builder v{version}</p>
      </div>
      <div className="flex items-center">
        {showUpdateAvailable && (
          <button
            onMouseOver={() => setUpdateContent('Install now !')}
            onFocus={() => setUpdateContent('Install now !')}
            onMouseOut={() => setUpdateContent('Update available !')}
            onBlur={() => setUpdateContent('Update available !')}
            onClick={handleUpdateClick}
            className="text-xs w-36 text-zinc-500 font-bold undraggable cursor-pointer hover:bg-orange-700 hover:text-orange-500 hover:bg-opacity-25 bg-zinc-800 px-4 py-0.5 rounded mr-5"
          >
            {updateContent}
          </button>
        )}
        <button onClick={window.Main.Minimize} className="undraggable h-full px-4 hover:bg-gray-700 hover:text-white">
          <VscChromeMinimize />
        </button>
        <button onClick={handleToggle} className="undraggable h-full px-6 lg:px-5 hover:bg-gray-700">
          {isMaximize ? <VscChromeRestore /> : <VscChromeMaximize />}
        </button>
        <button onClick={window.Main.Close} className="undraggable h-full px-4 hover:bg-red-500 hover:text-white">
          <VscChromeClose />
        </button>
      </div>
    </div>
  );
};

export default AppBar;
