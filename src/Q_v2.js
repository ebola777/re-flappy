function choose_action(epsilon, state_x, state_y, q_table){
  var actions = q_table[state_x][state_y];
  var flag_zeros = 1;
  var max = -Infinity;
  var argmax = void(0);
  
  for(var i=0, len=actions.length; i<len; i++){
    if(actions[i]!=0){
      flag_zeros = 0;
    }
  }
  
  if(Math.random()<=epsilon || flag_zeros==1){
    return 0; //Math.floor((Math.random() * 2))
  }
  else{
    for(var i=0, len=actions.length; i<len; i++){
      if(actions[i]>max){
        max = actions[i];
        argmax = i;
      }
    }
    return argmax; //0 or 1
  }

}

Q = (function() {

  "use strict";

  var something;
  
  // Define a 3-D q_table
  var d1 = 6;
  var d2 = 12;
  var d3 = 2;
  
  var q_table = new Array(d1);
  for(var i=0; i<d1; i++){
    q_table[i] = new Array(d2);
    
    for(var j=0; j<d2; j++){
      q_table[i][j] = new Array(d3);
    }
  }
  
  for(var i=0; i<d1; i++){
    for(var j=0; j<d2; j++){
      for(var k=0; k<d3; k++){
        q_table[i][j][k] = 0;
      }
    }
  }
  
  // Define variables
  var epsilon = 0.01;
  var alpha = 0.1;
  var gamma = 0.9;
  var reward = 0;
  var flag_ini = 1;
  var cnt = 0;
  
  var state_x = 0;
  var state_y = 0;
  var action = 0;
  var state_x_pre = 0;
  var state_y_pre = 0;
  var action_pre = 0;
  
  return function (dx, dy, hasCollision) {
    // Write the Q learning algorithm here.
    // Input: dx, dy, if there is a collision
    // Output: jump or not
    cnt++;
    if(cnt>10000){
        epsilon = 0.01/(cnt/100000);
    }
    
    state_x_pre = state_x;
    state_y_pre = state_y;
    action_pre = action;
    
    state_x = Math.floor(dx/100);
    state_y = Math.floor(dy/11);
    if(state_x>5){
      state_x = 5;
    }
    if(state_y<0){
      state_y = 0;
    }
    if(state_y>11){
      state_y = 11;
    }
    
    if(hasCollision){
      reward = -1;
    }
    else{
      reward = 0.001;
    }
    
    if(dx<522.88){
      q_table[state_x_pre][state_y_pre][action_pre] += alpha*(reward + gamma*Math.max(...q_table[state_x][state_y]) - q_table[state_x_pre][state_y_pre][action_pre]);
    }
    action = choose_action(epsilon,state_x,state_y,q_table);
    return action;
    
  };

}());
