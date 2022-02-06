import React from 'react';
import { NodeContainer } from '@/models/nodes';
import { FaChevronCircleLeft, FaChevronCircleRight, FaChevronRight } from 'react-icons/fa';
import { BiImport } from 'react-icons/bi';
import { BsFillCheckCircleFill, BsFillXCircleFill } from 'react-icons/bs';
import reactStringReplace from 'react-string-replace';
import { emitCustomEvent, useCustomEventListener } from 'react-custom-events';
import { base64URLDecode, base64URLEncode, toUInt16, toUInt32, UInt16ToBytes, UInt32ToBytes } from '@/utils';
import { ATLAS_TREE_POE_VERSION } from '@/constants';

interface Props {
  nodes: NodeContainer;
}

const TreeSummary: React.FC<Props> = ({ nodes }) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(true);

  const [allocatedNodes, setAllocatedNodes] = React.useState<number[]>([]);
  const [allocatedModGroups, setAllocatedModGroups] = React.useState<Record<string, number>>({});

  useCustomEventListener('allocated-changed', (allocated: number[]) => {
    setAllocatedNodes(allocated);
  });

  React.useEffect(() => {
    if (allocatedNodes.length === 0) return;
    const allocatedStats = Object.values(nodes)
      .filter((x) => allocatedNodes.includes(x.skill))
      .map((x) => x.stats)
      .reduce((acc, curr) => acc.concat(curr));
    const newAllocatedModsGroups: Record<string, number> = {};
    allocatedStats.forEach((x) => {
      // Does it match #% ?
      const matchPercent = x.match(/\+?(\d*\.?\d+)%/);
      const matchAdditional = x.match(/an additional/);
      const matchPlusFlat = x.match(/\+(\d*\.?\d+)/);
      const matchFlat = x.match(/(\d*\.?\d+)/);
      if (matchPercent) {
        const generic = x.slice().replace(/(\+?)(\d*\.?\d+)%/, '$1#%');
        const extractedValue = parseFloat(matchPercent[0]);
        if (!newAllocatedModsGroups[generic] && newAllocatedModsGroups[generic] !== 0)
          newAllocatedModsGroups[generic] = 0;
        newAllocatedModsGroups[generic] += extractedValue;
      } else if (matchAdditional) {
        const generic = x.slice().replace(/an additional/, '#');
        const clearedValue = matchAdditional[0].replace('additional', '').trim();
        const extractedValue = parseInt(clearedValue === 'an' ? '1' : clearedValue, 10);
        if (!newAllocatedModsGroups[generic] && newAllocatedModsGroups[generic] !== 0)
          newAllocatedModsGroups[generic] = 0;
        newAllocatedModsGroups[generic] += extractedValue;
      } else if (matchPlusFlat) {
        const generic = x.slice().replace(/\+(\d*\.?\d+)/, '+#');
        const extractedValue = parseFloat(matchPlusFlat[0]);
        if (!newAllocatedModsGroups[generic] && newAllocatedModsGroups[generic] !== 0)
          newAllocatedModsGroups[generic] = 0;
        newAllocatedModsGroups[generic] += extractedValue;
      } else if (matchFlat) {
        const generic = x.slice().replace(/(\d*\.?\d+)/, '#');
        const extractedValue = parseFloat(matchFlat[0]);
        if (!newAllocatedModsGroups[generic] && newAllocatedModsGroups[generic] !== 0)
          newAllocatedModsGroups[generic] = 0;
        newAllocatedModsGroups[generic] += extractedValue;
      } else {
        // No match, must be non-scalable modifier
        const generic = x.slice();
        if (!newAllocatedModsGroups[generic] && newAllocatedModsGroups[generic] !== 1)
          newAllocatedModsGroups[generic] = 1;
      }
    });
    setAllocatedModGroups(newAllocatedModsGroups);
  }, [allocatedNodes]);

  const [showValidation, setShowValidation] = React.useState<string>();
  const [showError, setShowError] = React.useState<string>();
  const [showImportModal, setShowImportModal] = React.useState<boolean>(false);
  const [textareaText, setTextareaText] = React.useState<string>();

  const handleExport = () => {
    const concatedNodes = allocatedNodes
      .filter((x) => x !== 29045)
      .sort((a, b) => a - b)
      .map((x) => UInt16ToBytes(x))
      .reduce((prev, curr) => prev.concat(curr));
    // eslint-disable-next-line no-bitwise
    const concated = [...UInt32ToBytes(6), 0, 0, allocatedNodes.length - 1, ...concatedNodes, 0, 0];
    window.Main.copyToClipboard(base64URLEncode(concated));
    setShowValidation('The tree has been copied to your clipboard !');
    setTimeout(() => setShowValidation(undefined), 10000);
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaText(event.target.value);
  };

  const handleImport = () => {
    if (!textareaText) return;
    try {
      const decoded = base64URLDecode(textareaText);
      let version = 0;
      try {
        version = toUInt32(decoded.slice(0, 4));
      } catch (e) {
        throw new Error('The tree you provided is invalid.');
      }
      const decodedClass = decoded[4];
      const ascendancy = decoded[5];
      if (version !== ATLAS_TREE_POE_VERSION) throw new Error('The provided tree is either too old or not compatible.');
      if (decodedClass > 0 || ascendancy > 0) throw new Error('The provided tree is not an Atlas Skill tree.');
      const nodesCount = decoded[6];
      const decodedNodes = [];
      let cursor = 7;
      for (let i = 0; i < nodesCount; i += 1) {
        let node = 0;
        try {
          node = toUInt16(decoded.slice(cursor, cursor + 2));
        } catch (e) {
          throw new Error('The tree you provided is invalid.');
        }
        decodedNodes.push(node);
        cursor += 2;
      }
      emitCustomEvent('import-tree', decodedNodes);
      setShowImportModal(false);
      setShowError(undefined);
    } catch (e: any) {
      setShowError(e.message);
    }
  };

  const handleReset = () => {
    setAllocatedNodes([]);
    setAllocatedModGroups({});
    emitCustomEvent('reset-tree');
  };

  /* eslint-disable jsx-a11y/click-events-have-key-events */
  return (
    <>
      {showImportModal && (
        <div className="flex flex-none justify-center w-full items-center">
          <div
            className="absolute left-0 top-0 z-30 bg-black flex justify-center items-center bg-opacity-50 w-full h-screen"
            onClick={() => setShowImportModal(false)}
            role="none"
          />

          <div className="w-1/2 select-none bg-zinc-900 text-slate-300 px-5 py-5 rounded-xl relative z-30 flex flex-col">
            <h2 className="text-2xl w-full font-bold text-orange-400 text-center mb-7">Import a tree</h2>

            {showError && (
              <div className="px-5 py-3 mb-5 flex items-center rounded bg-red-700 bg-opacity-10  text-red-500">
                <BsFillXCircleFill className="text-2xl mr-3" />
                <div className="flex flex-col">
                  <span className="font-bold">Oops !</span>
                  <span className="text-sm text-red-200">{showError}</span>
                </div>
              </div>
            )}
            <p className="mb-3 text-zinc-400 font-bold text-sm">Use the following area to paste your encoded tree:</p>
            <textarea
              onChange={handleChange}
              name="import"
              className="bg-zinc-800 text-xs h-72 w-full flex-grow rounded resize-none text-zinc-500 focus:outline-none p-3 mb-5"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="py-1 px-7 mr-3 border-2 border-zinc-800 hover:text-orange-400 text-zinc-500 rounded cursor-pointer hover:bg-stone-800 font-bold"
              >
                Close
              </button>
              <button
                onClick={handleImport}
                disabled={!textareaText}
                className="py-1 pr-10 pl-8 flex items-center bg-lime-900 disabled:opacity-40 disabled:cursor-not-allowed hover:text-lime-400 text-lime-500 rounded cursor-pointer hover:bg-lime-800 font-bold"
              >
                <BiImport className="inline mr-2" />
                Import
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`w-[32rem] absolute top-0 h-full pt-8 transition-transform ease-in-out z-20 ${
          collapsed ? '-translate-x-[32rem]' : ''
        }`}
      >
        <div className="w-[32rem] flex flex-col h-full shrink bg-zinc-900  text-slate-400 p-3">
          <div className="flex justify-around mt-5 mb-5">
            <button
              disabled={allocatedNodes.length === 0}
              className="py-1 px-10 bg-zinc-800 hover:text-orange-400 text-zinc-500 rounded cursor-pointer hover:bg-stone-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-800 disabled:hover:text-zinc-500"
              onClick={handleExport}
            >
              Export
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="py-1 px-10 bg-zinc-800 text-zinc-500 hover:text-orange-400 rounded cursor-pointer hover:bg-stone-800 font-bold"
            >
              Import
            </button>
            <button
              onClick={handleReset}
              className="py-1 px-10 bg-red-900 bg-opacity-30 text-red-200 text-opacity-50 hover:text-red-400 rounded cursor-pointer hover:bg-red-900 hover:bg-opacity-40 font-bold"
            >
              Reset
            </button>
          </div>
          {showValidation && (
            <div className="px-5 py-3 mb-5 flex items-center rounded bg-lime-700 bg-opacity-10  text-lime-500">
              <BsFillCheckCircleFill className="text-2xl mr-3" />
              <div className="flex flex-col">
                <span className="font-bold">Success !</span>
                <span className="text-sm text-lime-200">{showValidation}</span>
              </div>
            </div>
          )}
          <h3 className="uppercase w-full mt-3 mb-3 text-center text-orange-400 text-opacity-70 text-sm font-bold">
            Current modifiers
          </h3>
          <ul className="overflow-y-auto h-full">
            {Object.entries(allocatedModGroups).map(([modDesc, modValue]) => (
              <li className="text-sm mb-1 flex items-top" key={modDesc}>
                <FaChevronRight className="inline h-full mt-1 text-orange-400 text-opacity-70 mr-1" />
                <span>
                  {reactStringReplace(modDesc, '#', () => {
                    if (modDesc.includes('#%'))
                      return (
                        <span key={modDesc} className="text-sky-500 font-bold">
                          {modValue}
                        </span>
                      );
                    if (modDesc.includes('+#'))
                      return (
                        <span key={modDesc} className="text-sky-500 font-bold">
                          {modValue}
                        </span>
                      );
                    return (
                      <span key={modDesc} className="text-sky-500 font-bold">
                        {modValue === 1 ? 'an' : modValue} additional{modValue > 1 ? 's' : ''}
                      </span>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="absolute top-8 -right-36 w-36 h-10 shrink-0 bg-zinc-900 flex items-center justify-center text-orange-400 hover:text-orange-300 rounded-br-lg"
          onClick={() => setCollapsed(!collapsed)}
        >
          <p className="text text-center font-bold tracking-wider opacity-50 flex items-center">
            {collapsed && <FaChevronCircleRight className="mr-2 text-orange-300" />}
            {!collapsed && <FaChevronCircleLeft className="mr-2 text-orange-300" />}
            SUMMARY
          </p>
        </button>
      </div>
    </>
  );
};

export default TreeSummary;
