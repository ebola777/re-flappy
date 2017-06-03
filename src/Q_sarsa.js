window.Q = (function () {
  'use strict';

  /* Constants */
  // Sarsa parameters
  var nonGreedyProb = 1.0;
  var learningRate = 0.5;
  var discountFactor = 0.99;
  var nonGreedyDecayDuration = 10.0;
  // Feature space
  var discreteDistance = 50.0;
  // State space
  var stateSpace = null;
  // Action space
  var actionSpace = [true, false];
  // Evaluation
  var avgScoreThresh = 100.0;
  var threshCountLimit = 10;

  /* Runtime properties */
  // Q table
  var qTable = {};
  // Training variables
  var lastState = null;
  var lastAction = null;
  var lastScore = 0;
  // Episode variables
  var episodeIndex = 0;
  // Evaluation
  var totalScore = 0.0;
  var scoreList = [];
  var scoreListMaxLen = 100;
  var avgScore = 0.0;
  var threshCount = 0;

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

  var _calcAvgScore = function (score) {
    if (scoreList.length >= scoreListMaxLen) {
      totalScore -= scoreList.shift();
    }
    scoreList.push(score);
    totalScore += score;
    avgScore = 1.0 * totalScore / scoreList.length;
  };

  var _decay = function () {
    if (avgScore >= avgScoreThresh) {
      threshCount += 1;
      if (threshCount >= threshCountLimit) {
        if (nonGreedyProb > 0.0) {
          console.log('The average score has reached ' + avgScoreThresh +
            ' over ' + threshCount + ' times, ' +
            'the training session is going to end');
        }
        nonGreedyProb = 0.0;
        learningRate = 0.0;
      }
    } else {
      threshCount = 0;
      nonGreedyProb = 1 / ((episodeIndex + 1) / nonGreedyDecayDuration);
    }
  };

  return function (dx, dy, hasCollision, score) {
    // Get the state
    var state = _getState(dx, dy);
    var reward = _getReward(hasCollision, lastScore, score);
    // When the state is terminal
    if (_isTerminalState(hasCollision)) {
      // Calculate average score
      _calcAvgScore(score);
      // Decay
      _decay();
      // Prepare the next episode
      episodeIndex += 1;
      _resetEpisode();
      // Print the episode info
      if ((episodeIndex + 1) % 100 === 0) {
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
    // Learn
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