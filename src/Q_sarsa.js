window.Q = (function () {
  'use strict';

  /* Constants */
  // Parameters
  var initNonGreedyProb = 1.0;
  var minNonGreedyProb = 1e-4;
  var initLearningRate = 0.5;
  var minLearningRate = 0.5;
  var discountFactor = 0.9;
  var nonGreedyDecayDuration = 10.0;
  var learningRateDecayDuration = 1000.0;
  // Feature space
  var discreteDistance = 50.0;
  // State space
  var stateSpace = null;
  // Action space
  var actionSpace = [true, false];
  // Evaluation
  var scoreThresh = 1000.0;

  /* Runtime properties */
  // Q table
  // Parameters
  var nonGreedyProb = initNonGreedyProb;
  var learningRate = initLearningRate;
  var qTable = {};
  // Training variables
  var isTraining = true;
  var lastState = null;
  var lastAction = null;
  var lastScore = 0;
  // Episode variables
  var episodeIndex = 0;
  // Evaluation
  var totalScore = 0.0;
  var scoreList = [];
  var scoreListMaxLen = 1000;
  var avgScore = 0.0;

  /* Functions */
  var _resetEpisode = function () {
    lastState = null;
    lastAction = null;
    lastScore = 0;
  }

  var _getState = function (dx, dy) {
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
      return (lastScore !== score ? 1.0 : 1e-3);
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
        stateQValueSet[action] = 1.0;
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
      return false;
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

  var _calcAvgScore = function (score) {
    if (scoreList.length >= scoreListMaxLen) {
      totalScore -= scoreList.shift();
    }
    scoreList.push(score);
    totalScore += score;
    avgScore = 1.0 * totalScore / scoreList.length;
  };

  var _decay = function () {
    nonGreedyProb = initNonGreedyProb /
      ((episodeIndex + 1) / nonGreedyDecayDuration);
    nonGreedyProb = _.clamp(nonGreedyProb, minNonGreedyProb, initNonGreedyProb);
    learningRate = initLearningRate /
      ((episodeIndex + 1) / learningRateDecayDuration);
    learningRate = _.clamp(learningRate, minLearningRate, initLearningRate);
  };

  var _printEpisodeInfo = function () {
    if ((episodeIndex + 1) % 100 === 0) {
      console.log('Episode: ' + (episodeIndex + 1) + '. ' +
        'Average score: ' + avgScore);
    }
  };

  return function (dx, dy, hasCollision, score) {
    // Get the state
    var state = _getState(dx, dy);
    var reward = _getReward(hasCollision, lastScore, score);
    // When the state is terminal
    if (_isTerminalState(hasCollision)) {
      // Restart the training
      if (!isTraining) {
        console.log('The terminal state is reached' +
          ', the training session is going to start');
        isTraining = true;
      }
      // Calculate average score
      _calcAvgScore(score);
      // Decay
      _decay();
      // Prepare the next episode
      episodeIndex += 1;
      _resetEpisode();
      // Print the episode info
      _printEpisodeInfo();
    }
    // If the state is equal to the last state, don't learn
    if (_.isEqual(state, lastState)) {
      return;
    }
    // If the score has reached the threshould, stop the training
    if (score >= scoreThresh) {
      if (isTraining) {
        console.log('The score has reached ' + scoreThresh +
          ', the training session is going to end');
        console.log('The problem is solved in episode ' + (episodeIndex + 1));
        isTraining = false;
        nonGreedyProb = 0.0;
      }
    }
    // Because it has only one function, we learn from the last action
    var observation = {
      state: lastState,
      action: lastAction,
      reward: reward,
      nextState: state,
    };
    // Learn
    if (isTraining) {
      _learn(observation);
    }
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