window.Q = (function () {
  'use strict';

  /* Constants */
  // Sarsa parameters
  var nonGreedyProb = 0.9;
  var learningRate = 0.5;
  var discountFactor = 0.99;
  var nonGreedyDecayFactor = 1e-4;
  var learningRateDecayFactor = 1e-5;
  // Feature space
  var discreteDistance = 50.0;
  // State space
  var stateSpace = null;
  // Action space
  var actionSpace = [true, false];
  // Training variables
  var lastState = null;
  var lastAction = null;
  var lastScore = 0;
  // Debugging information
  var episodeIndex = 0;
  var totalScore = 0.0;
  var scoreList = [];
  var scoreListMaxLen = 100;

  /* Runtime properties */
  // Q table
  var qTable = {};

  /* Functions */
  var _resetEpisode = function () {
    lastState = null;
    lastAction = null;
    lastScore = 0;
  }

  var _getState = function (dx, dy) {
    // Limit the distance in Y direction
    dy = _.min([200, dy]);
    var dxStepSize = _.round(dx / discreteDistance);
    var dyStepSize = _.round(dy / discreteDistance);
    var dxDiscretized = discreteDistance * dxStepSize;
    var dyDiscretized = discreteDistance * dyStepSize;
    return [dxDiscretized, dyDiscretized];
  };

  var _isTerminalState = function (hasCollision) {
    return hasCollision;
  }

  var _getReward = function (hasCollision, lastScore, score) {
    if (hasCollision) {
      return 0.0;
    } else {
      return (lastScore !== score ? 1.0 : 0.0);
    }
  };

  var _getQValue = function (state, action) {
    // Lazy lookup or insert
    var stateQValueSet = qTable[state];
    if (_.isUndefined(stateQValueSet)) {
      qTable[state] = {};
      stateQValueSet = qTable[state];
      for (var actionInd = 0; actionInd < actionSpace.length; actionInd += 1) {
        var action = actionSpace[actionInd];
        stateQValueSet[action] = 0.5 + (1e-6 * _.random(0.0, 1.0, true));
      }
    }
    return stateQValueSet[action];
  };

  var _chooseAction = function (state) {
    var prob = _.random(0.0, 1.0, true);
    if (prob >= nonGreedyProb) {
      var stateQValueSet = _.map(actionSpace, function (action, index) {
        return {
          index: index,
          value: _getQValue(state, action),
        };
      });
      var maxIndex = _.reduce(stateQValueSet, function (obj1, obj2) {
        return (obj1.value > obj2.value ? obj1.index : obj2.index);
      });
      return actionSpace[maxIndex];
    } else {
      var randIndex = _.random(actionSpace.length - 1);
      return actionSpace[randIndex];
    }
  };

  var _learn = function (observation) {
    var state = observation.state;
    var action = observation.action;
    var reward = observation.reward;
    var nextState = observation.nextState;
    if (_.isNull(state)) {
      return;
    }
    var nextAction = _chooseAction(nextState);
    var curSAQValue = _getQValue(state, action);
    var nextSAQValue = _getQValue(nextState, nextAction);
    var tdError = reward + (discountFactor * nextSAQValue) - curSAQValue;
    qTable[state][action] += learningRate * tdError;
  };

  return function (dx, dy, hasCollision, score) {
    // Get the state
    var state = _getState(dx, dy);
    var reward = _getReward(hasCollision, lastScore, score);
    // Decay the parameters at the end of the episode
    if (_isTerminalState(hasCollision)) {
      episodeIndex += 1;
      nonGreedyProb *= (1.0 - nonGreedyDecayFactor);
      learningRate *= (1.0 - learningRateDecayFactor);
      _resetEpisode();
      if ((episodeIndex + 1) % 10 === 0) {
        if (scoreList.length >= scoreListMaxLen) {
          totalScore -= scoreList.shift();
        }
        scoreList.push(score);
        totalScore += score;
        var avgScore = 1.0 * totalScore / scoreList.length;
        console.log('Episode ' + (episodeIndex + 1) +
          ': Average score: ' + avgScore);
      }
    }
    // If the state is equal to the last state, don't learn
    if (_.isEqual(state, lastState)) {
      return;
    }
    // Because it has only one function, we learn from the last action
    var observation = {
      state: lastState,
      action: lastAction,
      reward: reward,
      nextState: state,
    };
    _learn(observation);
    // Choose an action
    var action = _chooseAction(state);
    // Save the current state and action
    lastState = state;
    lastAction = action;
    // Save the current score
    lastScore = score;
    return action;
  };
}());