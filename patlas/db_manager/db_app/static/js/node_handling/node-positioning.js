/**
 * this function repositions the graph to center on the desired node
 * @param {Object} renderer - vivagraph object to render the graph
 * @param {Object} layout - vivagraph object with the graph layout
 * @param {string} storeMasterNode - variable that has a string with the
 * accession number in which the graph is centered
 */
const recenterDOM = (renderer, layout, storeMasterNode) => {
  const pos = layout.getNodePosition(storeMasterNode[0])
  renderer.moveTo(pos.x, pos.y)
}

/**
 * this function stores the node with more links
 * @param {string} storeMasterNode - variable that has a string with the
 * accession number in which the graph is centered
 * @param {Object} dictDist - object that stores all distances of a given node
 * @param sequence
 * @param counter
 * @returns {Array}
 */
const storeRecenterDom = (storeMasterNode, dictDist, sequence, counter) => {
  //console.log(dict_dist, sequence, counter)
  //let previousDictDist = storeMasterNode[1]
  //let storedNode = storeMasterNode[0]
  // checks if the node is the one with most links and stores it in storedNode
  const returnedArray = (counter > 0) ? (storeMasterNode[1] < dictDist.length) ?
    // if counter > 0 and dist_dict of current node is < than previous node
    // dict_dist
    [sequence, dictDist.length] :
    // otherwise return previous dict_dist
    [storeMasterNode[0], storeMasterNode[1]] :
    // this is used to check if counter is the first instance of the loop
    [sequence, dictDist.length]

  return returnedArray
}