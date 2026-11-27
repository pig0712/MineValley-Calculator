(function(W){
  "use strict";
  W.v.page=W.pageFromLocation();
  try { W.render(); }
  catch(err) {
    document.getElementById("main").innerHTML='<div class="warn">계산기를 여는 중 문제가 생겼습니다. '+W.esc(err.message)+'</div>'+W.btn("JSON 백업 복원","restoreOpen");
  }
})(window.W);

