const version = 0.3;
console.warn("current chess version: " + version);

var socket;
var chess_debug = true;

var highlighting = [];

var last_clicked_piece = {};

function setTile(x,y,pi) {
  if(x<0) {
    console.warn("setTile received invalid x: ",x);
    return
  }
  if(y<0) {
    console.warn("setTile received invalid y: ",y);
    return
  }
  if(x>7) {
    console.warn("setTile received invalid x: ",x);
    return
  }
  if(y>7) {
    console.warn("setTile received invalid y: ",y);
    return
  }
  console.log(x,y,pi);
  let background = document.getElementById(`${x}-${y}`).getElementsByClassName("bg")[0]
  if(background==null)console.error("setTile bg error");
  if(background.outerHTML==null)console.error("setTile outerHTML error");
  if(pi == null)document.getElementById(x + "-" + y).innerHTML = background.outerHTML
  let piecetype = pi.ptype
  let piece = pi.piece
  if(piecetype==null||piece==null||piece==""||piecetype==""||piece=="None"||piecetype=="None"){
    document.getElementById(x + "-" + y).innerHTML = background.outerHTML
    return
  }
  let p = `<img src="/images/pieces/${piecetype}/${piece}.png" piece="${piece}" piecetype="${piecetype}" draggable="false"  class="piece absolute" style="left:0px;top:0px" onclick="clicked_piece(${x},${y},'${piecetype}','${piece}')">`
  document.getElementById(x + "-" + y).innerHTML = background.outerHTML+p
}

function clicked_bg(x, y) {
  if (last_clicked_piece == null) return;
  if (last_clicked_piece == {}) return;

  for (let i = 0; i < highlighting.length; i++) {
    highlight_background(highlighting[i]["x"], highlighting[i]["y"]);
  }

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      try {
        document
          .getElementById(x + "-" + y)
          .getElementsByClassName("bg")[0]
          .setAttribute("onclick", "");
      } catch (e) {}
    }
  }

  highlighting = []; //unhighlights them
  // last_clicked_piece == current piece / piece to move
  //(x,y) == place to move it to
  let piece = last_clicked_piece.piece;
  let piecetype = last_clicked_piece.ptype;

  setTile(x,y,last_clicked_piece)
  let div = document.getElementById(
    last_clicked_piece.x + "-" + last_clicked_piece.y
  );
  div.innerHTML = div.innerHTML.replace(last_clicked_piece["html"], "");

  //start new message

  let updated_board = ""
  /*
    data structure:
    `
    xyptypepiece
    `

    where x is between 0 and 7 (1 char)
    where y is between 0 and 7 (1 char)
    where ptype is 0 or 1 (1 bit, 0=white,1=dark)
    where piece is one of the 6 pieces (Bishop=0,...,Rook=5,none=6) (1 char)
    one piece should therefore be a size of 4 chars, meaning that the whole size of a message would be 256 bytes long (at 1 char=1 byte as per UTF-8)

    this could further be improved, however this should already be good enough (compared to the 7KB per move before)
  */
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      updated_board+=x
      updated_board+=y

      let p = get_piece(x,y)
      if(p == undefined) {
        updated_board+="06"
        continue;
      }
      let ptype = p.src.replace("https://yourchess.ga/images/pieces/","").split("/")[0]
      let piece = p.src.slice(p.src.lastIndexOf("/")+1,p.src.length).replace(".png","") //from link to piece name
      if(ptype=="dark"){
        updated_board+="1"
      } else {
        updated_board+="0"
      }
      if(piece=="Bishop")updated_board+="0"
      if(piece=="King")updated_board+="1"
      if(piece=="Knight")updated_board+="2"
      if(piece=="Pawn")updated_board+="3"
      if(piece=="Queen")updated_board+="4"
      if(piece=="Rook")updated_board+="5"

      console.log("piece at",x,y,"is a",ptype,piece);
    }
  }

  try {
    socket.send("update-board" + updated_board); //I know this is a huge security risk
  }catch {
    console.warn("sending server move failed, retry in 1 second");
    setTimeout(function(){
      socket.send("update-board" + updated_board)
    },1000)
  }

  console.log("sent",updated_board);

  console.log("clicked bg at " + x + "," + y);
} //end clicked bg

function highlight_background(x, y) {
  let div = document.getElementById(x + "-" + y);
  if (div == null) return;
  let bg = div.getElementsByClassName("bg");
  if (bg == null) return;
  bg = bg[0];
  if (bg.src != "https://yourchess.ga/images/Boards/green.png") {
    bg.setAttribute("onclick", `clicked_bg(${x},${y})`);
    bg.src = "https://yourchess.ga/images/Boards/green.png";
  } else {
    bg.setAttribute("onclick", "");
    if (grid[x][y]["isdark"]) {
      bg.src = "/images/Boards/gray.png";
    } else {
      bg.src = "/images/Boards/white.png";
    }
  }
}

function ishighlighted(x, y) {
  for (var i = 0; i < highlighting.length; i++) {
    if (highlighting[i]["x"] == x && highlighting[i]["y"] == y) {
      return true;
    }
  }
  return false;
}

function highlight(x, y) {
  highlighting[highlighting.length] = {
    ["x"]: x,
    ["y"]: y,
  };
  highlight_background(x, y);
}

function haspiece(x, y) {
  let div = document.getElementById(x + "-" + y);
  if (div == null) return false;
  return div.getElementsByClassName("piece")[0] != null;
}

var player_piecetype_lock;

function clicked_piece(x, y, ptype, piece) {
  if(ptype!=player_piecetype_lock)return
  let div = document.getElementById(x + "-" + y);
  let bg = div.getElementsByClassName("bg")[0];
  if (bg != null) {
    if (ishighlighted(x, y)) {
      clicked_bg(x, y);
      return;
    } else {
      console.log(`bg at ${x},${y} is not highlighted`);
    }
  }
  for (let i = 0; i < highlighting.length; i++) {
    highlight_background(highlighting[i]["x"], highlighting[i]["y"]);
  }
  highlighting = [];
  let pie = div.getElementsByClassName("piece")[0];
  if (last_clicked_piece["x"] == x && last_clicked_piece["y"] == y) {
    last_clicked_piece = {};
    return;
  }
  last_clicked_piece = {
    ["html"]: pie.outerHTML,
    ["x"]: x,
    ["y"]: y,
    ["piece"]: piece,
    ["ptype"]: ptype,
  };
  console.log(ptype + " " + piece + " at " + x + " " + y);
  if (piece == "Pawn") {
    if (ptype == "white") {
      if (y == 0) {
        // TODO: promotion
        alert("Promotion is not implemented yet");
      }
      if (y == 6) {
        if (!haspiece(x, y - 2) && !haspiece(x, y - 1))
          highlight(x, y - 2);
      }
      if (!haspiece(x, y - 1)) highlight(x, y - 1);

      highlightDiffPiecesPos(x + 1, y - 1, x, y);

      highlightDiffPiecesPos(x - 1, y - 1, x, y);
    } else {
      if (y == 7) {
        // TODO: promotion
        alert("Promotion is not implemented yet");
      }
      if (y == 1) {
        if (!haspiece(x, y + 2) && !haspiece(x, y + 1))
          highlight(x, y + 2);
      }
      if (!haspiece(x, y + 1)) highlight(x, y + 1);
      highlightDiffPiecesPos(x + 1, y + 1, x, y);

      highlightDiffPiecesPos(x - 1, y + 1, x, y);
    }
  }
  if (piece == "King") {
    let targeted_piece;

    highlightDiffPiecesPos(x + 1, y + 1, x, y);
    if (!haspiece(x + 1, y + 1)) highlight(x + 1, y + 1);

    highlightDiffPiecesPos(x - 1, y - 1, x, y);
    if (!haspiece(x - 1, y - 1)) highlight(x - 1, y - 1);

    highlightDiffPiecesPos(x + 1, y - 1, x, y);
    if (!haspiece(x + 1, y - 1)) highlight(x + 1, y - 1);

    highlightDiffPiecesPos(x - 1, y + 1, x, y);
    if (!haspiece(x - 1, y + 1)) highlight(x - 1, y + 1);

    highlightDiffPiecesPos(x + 1, y, x, y);
    if (!haspiece(x + 1, y)) highlight(x + 1, y);

    highlightDiffPiecesPos(x, y + 1, x, y);
    if (!haspiece(x, y + 1)) highlight(x, y + 1);

    highlightDiffPiecesPos(x - 1, y, x, y);
    targeted_piece = get_piece(x - 1, y);
    if (!haspiece(x - 1, y)) highlight(x - 1, y);

    highlightDiffPiecesPos(x, y - 1, x, y);
    if (!haspiece(x, y - 1)) highlight(x, y - 1);
  }
  if (piece == "Knight") {
    highlightDiffPiecesPos(x + 2, y + 1, x, y);
    if (!haspiece(x + 2, y + 1)) highlight(x + 2, y + 1);

    highlightDiffPiecesPos(x + 2, y - 1, x, y);
    if (!haspiece(x + 2, y - 1)) highlight(x + 2, y - 1);

    highlightDiffPiecesPos(x - 2, y + 1, x, y);
    if (!haspiece(x - 2, y + 1)) highlight(x - 2, y + 1);

    highlightDiffPiecesPos(x - 2, y - 1, x, y);
    if (!haspiece(x - 2, y - 1)) highlight(x - 2, y - 1);

    highlightDiffPiecesPos(x + 1, y - 2, x, y);
    if (!haspiece(x + 1, y - 2)) highlight(x + 1, y - 2);

    highlightDiffPiecesPos(x + 1, y + 2, x, y);
    if (!haspiece(x + 1, y + 2)) highlight(x + 1, y + 2);

    highlightDiffPiecesPos(x - 1, y + 2, x, y);
    if (!haspiece(x - 1, y + 2)) highlight(x - 1, y + 2);

    highlightDiffPiecesPos(x - 1, y - 2, x, y);
    if (!haspiece(x - 1, y - 2)) highlight(x - 1, y - 2);
  }

  if (piece == "Rook" || piece == "Queen") {
    let targeted_piece;
    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x - i, y, x, y);
      if (haspiece(x - i, y)) {
        i = 9;
      } else {
        highlight(x - i, y);
      }
    }

    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x + i, y, x, y);
      if (haspiece(x + i, y)) {
        i = 9;
      } else {
        highlight(x + i, y);
      }
    }

    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x, y - i, x, y);
      if (haspiece(x, y - i)) {
        i = 9;
      } else {
        highlight(x, y - i);
      }
    }

    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x, y + i, x, y);
      if (haspiece(x, y + i)) {
        i = 9;
      } else {
        highlight(x, y + i);
      }
    }
  }

  if (piece == "Bishop" || piece == "Queen") {
    let targeted_piece;
    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x - i, y - i, x, y);
      if (haspiece(x - i, y - i)) {
        i = 9;
      } else {
        highlight(x - i, y - i);
      }
    }

    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x + i, y - i, x, y);
      if (haspiece(x + i, y - i)) {
        i = 9;
      } else {
        highlight(x + i, y - i);
      }
    }

    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x - i, y + i, x, y);
      if (haspiece(x - i, y + i)) {
        i = 9;
      } else {
        highlight(x - i, y + i);
      }
    }

    for (let i = 1; i <= 7; i++) {
      highlightDiffPiecesPos(x + i, y + i, x, y);
      if (haspiece(x + i, y + i)) {
        i = 9;
      } else {
        highlight(x + i, y + i);
      }
    }
  }
} //end piece move

let boardsize = 512;
const c_w = window.innerWidth;
const c_h = window.innerHeight;
var showed_text = false;
var old = "";
var hide_message = false
function checksize() {
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (c_w != w || c_h != h) {
    if (!showed_text) {
      console.warn(
        "please do not change your window size for optimal game experience"
      );
    }
    showed_text = true;
  }
  if ((w < boardsize + 200 || h < boardsize + 200)&& !hide_message) {
    if (old == "") old = document.body.innerHTML;
    document.body.innerHTML = `<h1 style="color:red;">Your screen size is too small to show the chess board, please adjust the window size</h1>`;
  } else {
    if (old != "") {
      document.body.innerHTML = old;
      old = "";
    }
  }
  setTimeout(checksize, 100);
}

checksize();

function game_update(data) {
  for (let i = 0; i < data.length; i+=4) {
    let current = data.slice(i,i+4)
    console.log("i:",i,"current:",current)

    let x = parseInt(current.charAt(0))
    let y = parseInt(current.charAt(1))
    let ptype = current.charAt(2)
    let piece = current.charAt(3)
    if(ptype=="1"){
      ptype="dark"
    } else {
      ptype="white"
    }
    if(piece=="0")piece="Bishop"
    if(piece=="1")piece="King"
    if(piece=="2")piece="Knight"
    if(piece=="3")piece="Pawn"
    if(piece=="4")piece="Queen"
    if(piece=="5")piece="Rook"
    if(piece=="6")piece="None"
    console.log("piece at",x,y,"is a",ptype,piece);
    setTile(x,y,{["ptype"]:ptype,["piece"]:piece})
  }
}

function createws(fetch_data) {
  socket = new WebSocket("wss://yourchess.ga:3001");
  socket.addEventListener("close",function(e) {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
    setTimeout(function() {
      createws(true);
    }, 1000);
  });
  socket.addEventListener("open", function (event) {
    console.log("opened a connection to the game server!");
    let link = window.location.href.toString().split(window.location.host)[1]
    let room = link.split("/user/")[1]
    if(room.search("PRIVATE-")!=-1){
      //this is a private game, we have to verify ourselves before joining it
      socket.send("verify-user"+getCookie("Session"))
    }
    socket.send("join-game"+room)

  });
  socket.addEventListener("message", function (event) {
    let data = event.data;

    if (chess_debug) {
      console.log("event data", data);
    }

    if(data.search("game-update")==0) {
      data=data.split("game-update")[1]
      game_update(data)
    }//game update

    if(data.search("color-update")==0){
      let color=data.split("color-update")[1]
      player_piecetype_lock=color //lock the clickable pieces to the color sent by the server
      //alert("you are playing as: "+color)
    }
    if(data.search("spectating")==0){
      clicked_piece = function(){}
      clicked_bg = function(){}
      alert("you are spectating this game, this means you cannot move any pieces")
    }

  }); //onmessage

  if(fetch_data==true) {
    setTimeout(function(){
      try {
        socket.send("fetch-board")
      } catch (e) {}
    },100)
  }
}
var grid = {};
var doc = document.getElementById("maindiv");
for (let x = 0; x < 8; x++) {
  grid[x] = grid[x] || {};
  for (let y = 0; y < 8; y++) {
    grid[x][y] = grid[x][y] || {};
    let isDark = (x + y) % 2 == 1;
    grid[x][y]["isdark"] = isDark;
    if (isDark) {
      grid[x][y][
        "dom"
      ] = `<img src="/images/Boards/gray.png"  class="bg" width=${
        boardsize / 8
      } height=${boardsize / 8} draggable="false">`;
    } else {
      grid[x][y][
        "dom"
      ] = `<img src="/images/Boards/white.png" class="bg" width=${
        boardsize / 8
      } height=${boardsize / 8} draggable="false">`;
    }
  }
}
console.log("created 2d grid");

for (let y = 0; y < 8; y++) {
  doc.innerHTML += "<br>";
  for (let x = 0; x < 8; x++) {
    let toinsert = `<div class="board absolute" id='${x}-${y}' style="left:${
      c_w / 3 - boardsize / 8 + (x * boardsize) / 8
    }px;top:${c_h / 4 - boardsize / 8 + (y * boardsize) / 8}px">`;
    let piece = "dummy";

    if (y == 1 || y == 6) piece = "Pawn";
    if (y == 0 || y == 7) {
      switch (x) {
        case 0:
        case 7:
          piece = "Rook";
          break;
        case 1:
        case 6:
          piece = "Knight";
          break;
        case 2:
        case 5:
          piece = "Bishop";
          break;
        case 3:
          piece = "Queen";
          break;
        case 4:
          piece = "King";
          break;
      }
    }
    toinsert += grid[x][y]["dom"];
    toinsert += "</div>";
    doc.innerHTML += toinsert;
    if (piece != "dummy") {
      let ptype = "white";
      if (y < 6) ptype = "dark";
      setTile(x,y,{"ptype":ptype,"piece":piece})
    }
  }
}
console.log("showing 2d grid");
console.log("trying to connect with game server");

createws();

function get_piece(x, y) {
  let div = document.getElementById(x + "-" + y);
  if (div == null) return;
  let piece = div.getElementsByClassName("piece")[0];
  return piece;
}

function arePiecesNotSameColor(p1, p2) {
  if (p1 == null) return false;
  if (p2 == null) return false;
  try {
    return (
      (p1.src.search("dark") == -1 && p2.src.search("white") == -1) ||
      (p1.src.search("white") == -1 && p2.src.search("dark") == -1)
    );
  } catch {
    return false;
  }
  return false;
}

function highlightDiffPiecesPos(x1, y1, x2, y2) {
  if (arePiecesNotSameColor(get_piece(x1, y1), get_piece(x2, y2))) {
    highlight(x1, y1);
  }
}
