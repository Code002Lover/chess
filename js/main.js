const version = 0.3;
console.warn("current chess version: " + version);

var socket;
var chess_debug = true;

var highlighting = [];

var last_clicked_piece = {};

function setTile(x,y,pi) {
  let background = document.getElementById(`${x}-${y}`).getElementsByClassName("bg")[0]
  if(background==null)console.error("setTile bg error");
  if(background.outerHTML==null)console.error("setTile outerHTML error");
  if(pi == null)document.getElementById(x + "-" + y).innerHTML = background.outerHTML
  let piecetype = pi.ptype
  let piece = pi.piece
  if(piecetype==null||piece==null)document.getElementById(x + "-" + y).innerHTML = background.outerHTML
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

  let pieces = [];

  for (let x = 0; x < 8; x++) {
    pieces[x] = [];
    for (let y = 0; y < 8; y++) {
      let div = document.getElementById(x + "-" + y);
      if (div == null) {
        console.warn("div==null??", x, y);
        continue;
      }
      let piece =
        div.getElementsByClassName("piece")[
          div.getElementsByClassName("piece").length - 1
        ];
      if (piece == null) {
        //not every div has a piece
        continue;
      }
      piece =
        div.getElementsByClassName("piece")[
          div.getElementsByClassName("piece").length - 1
        ].outerHTML;
      pieces[x][y] = piece;
    }
  }
  try {
    socket.send("update-board" + JSON.stringify(pieces)); //I know this is a huge security risk
  }catch {
    console.warn("sending server move failed, retry in 1 second");
    setTimeout(function(){
      socket.send("update-board" + JSON.stringify(pieces))
    },1000)
  }
  console.log("clicked bg at " + x + "," + y);
}

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

function clicked_piece(x, y, ptype, piece) {
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
    console.log("last_clicked_piece: ", last_clicked_piece);
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
        console.warn("TODO: promotion UI");
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
        console.warn("TODO: promotion UI");
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

    if(data.search("game-update")==0) {
      data=data.split("game-update")[1]
      let current_pieces = [];
      for (let x = 0; x < 8; x++) {
        current_pieces[x] = [];
        for (let y = 0; y < 8; y++) {
          let div = document.getElementById(x + "-" + y);
          if (div == null) {
            console.warn("div==null??", x, y);
            continue;
          }
          let piece =
            div.getElementsByClassName("piece")[
              div.getElementsByClassName("piece").length - 1
            ];
          if (piece == null) {
            //console.warn("piece==null", x, y);
            continue;
          }
          piece =
            div.getElementsByClassName("piece")[
              div.getElementsByClassName("piece").length - 1
            ].outerHTML;
          current_pieces[x][y] = piece;
        }
      }
      if (chess_debug) {
        console.log("event data", data);
      }
      let new_pieces = JSON.parse(data);
      if (current_pieces.equals(new_pieces)) return "already up to date";
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          if (new_pieces[x][y] == current_pieces[x][y]) continue;
          if (new_pieces[x][y] == null) new_pieces[x][y] = "";
          if (new_pieces[x][y] == "null") new_pieces[x][y] = "";
          if (new_pieces[x][y] == "undefined") new_pieces[x][y] = "";
          let div = document.getElementById(x + "-" + y);
          if (div == null) {
            console.warn("div==null??", x, y);
            continue;
          }
          let bg = div.getElementsByClassName("bg")[0];
          if (bg == null) {
            console.warn("bg==null", x, y);
            continue;
          }
          bg = bg.outerHTML;
          div.innerHTML = (bg + new_pieces[x][y])
            .replace(/\"null\"/, "")
            .replace(/\"undefined\"/, "");
        }
      }
    }//game update

    if(data.search("color-update")==0){
      data=data.split("color-update")[1]
      // TODO: restrict movement of pieces to color that matches "data"
    }
    if(data.search("spectating")==0){
      // TODO: disable movement completely and show a message without alert
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
