Q = (function () {

  "use strict";

  var something;

  return function (dx, dy, hasCollision, score) {
    // Write the Q learning algorithm here.
    // Input: dx, dy, if there is a collision
    // Output: jump or not

    if (dy <= 22) {
      return true;
    } else {
      return false;
    }

    return false;
  };

}());