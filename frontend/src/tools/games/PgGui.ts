import { AdvancedDynamicTexture,
  Button, Control, Rectangle, InputPassword,
  InputText, TextBlock, ScrollViewer
} from "@babylonjs/gui";
import { navigate } from "../../router";
import { type Match, createMatch, deleteMatch, updateMatchResult,
  type Tournament, launchTournament, joinTournamentAsGuest,
  joinTournamentAsLogged, startTournament, deleteTournament, nextTournamentMatch
} from "../APIStorageManager";

import { popUpAlert } from "../popup";

export default class PgGui {
  hostPlayer: string;

  ui: AdvancedDynamicTexture;

  font: Rectangle;
  font2: Rectangle;

  goBackUI: string = "";
  goBackButton: Button;

  currentMatch: Match | null = null;
  currentTournament: Tournament | null = null;
  rounds: { [index: number]: Match[] } = {};
  currentRoundIndex = 0;
  currentMatchIndex = 0;

  started: boolean = false;
  startedType: { type: string, aiMode1?: string, aiMode2?: string } | null = null;

  menu: {
    title: TextBlock,
    local: Button,
    vsAI: Button,
    tournament: Button,
    watchAI: Button,
    quit: Button,
    visibility(visible: boolean): void
  };

  vsFriend: {
    title: TextBlock,
    login: Button,
    guest: Button,
    visibility(visible: boolean): void
  };

  tournament: {
    title: TextBlock,
    host: TextBlock,
    hostPlayer: TextBlock,
    selectSize: TextBlock,
    size4: TextBlock,
    size8: TextBlock,
    size16: TextBlock,
    switchToPlayersSetting(nbPlayers: number): void,
    addGuest: Button,
    addLogin: Button,
    numberOfAI: TextBlock,
    playersScrollViewer: {
      scrollViewer: ScrollViewer,
      title: TextBlock,
      playersBlock: Rectangle,
      players: TextBlock[],
    },
    addPlayer(player: {id: string, name: string}): void,
    start: Button,
    showBracket(winnerName: string): void,
    visibility(visible: boolean): void
  };

  match: {
    matchBlock: Rectangle,
    title: TextBlock,
    player1: TextBlock,
    player2: TextBlock,
    constVS: TextBlock,
    play: Button,
    visibility(visible: boolean, player1?: string, player2?: string): void
  };

  pause: {
    title: TextBlock,
    resume: Button,
    menu: Button,
    quit: Button,
    isPaused(): boolean
    visibility(visible: boolean): void
  };

  result: {
    title: TextBlock,
    player: TextBlock,
    wins: TextBlock,
    nextMatch: Button,
    menu: Button,
    show(): void,
    visibility(visible: boolean): void
  };

  vsAI: {
    title: TextBlock,
    selectedAIMode: string,
    restless: Button,
    normal: Button,
    smart: Button,
    start: Button,
    visibility(visible: boolean): void
  };

  watchAI: {
    title: TextBlock,
    left: {
      title: TextBlock,
      selectedAIMode: string,
      restless: Button,
      normal: Button,
      smart: Button
    },
    right: {
      title: TextBlock,
      selectedAIMode: string,
      restless: Button,
      normal: Button,
      smart: Button
    },
    start: Button,
    visibility(visible: boolean): void
  };

  login: {
    block: Rectangle,
    close: Button,
    title: TextBlock,
    username: InputText,
    password: InputText,
    login: Button,
    visibility(visible: boolean, prevUI?: any): void
  };

  score: {
    left: TextBlock,
    right: TextBlock,
    constHyphen: TextBlock,
    update(scoreSide: "left" | "right", score: number): void,
    visibility(visible: boolean): void
  };
  
  panel: {
    block: Rectangle,
    players: {
      block: Rectangle,
      player1: TextBlock,
      player2: TextBlock,
      constVS: TextBlock
    };
    winParts: {
      block: Rectangle,
      title: TextBlock,
      player1: TextBlock,
      player2: TextBlock,
      constHyphen: TextBlock
    };
    speed: {
      block: Rectangle,
      title: TextBlock,
      value: TextBlock,
      unit: TextBlock,
      update(value: number): void
    };
    visibility(visible: boolean): void
  };

  constructor(hostPlayer: string) {
    this.hostPlayer = hostPlayer;

    this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    this.panel = this.initPanel();
    this.score = this.initScore();

    const font = new Rectangle("font"); {
      font.background = "black";
      font.alpha = 0.4;
      this.ui.addControl(font);
    }
    this.font = font;

    const goBackButton = Button.CreateSimpleButton("goBackButton", "← Go Back"); {
      goBackButton.width = 200 + "px";
      goBackButton.height = 60 + "px";
      goBackButton.top = "300px";
      goBackButton.left = "-50px";
      goBackButton.fontSize = 34 + "px";
      goBackButton.color = "white";
      goBackButton.thickness = 0;
      goBackButton.background = "transparent";
      goBackButton.alpha = 0.7;
      goBackButton.isVisible = false;
      goBackButton.onPointerEnterObservable.add(() => {
        goBackButton.color = "green";
        goBackButton.alpha = 1;
      });
      goBackButton.onPointerOutObservable.add(() => {
        goBackButton.color = "white";
        goBackButton.alpha = 0.7;
      });
      goBackButton.onPointerClickObservable.add(() => {
        if (this.currentTournament) {
            deleteTournament(this.currentTournament.id);
            this.currentTournament = null;
            this.rounds = {};
            this.currentRoundIndex = 0;
            this.currentMatch = null;
        }
        this.goBack();
      });
      this.ui.addControl(goBackButton);
    }
    this.goBackButton = goBackButton;
    
    this.menu = this.initMenu();
    this.vsFriend = this.initVSFriend();
    this.tournament = this.initTournament();
    this.match = this.initMatch();
    this.pause = this.initPause();
    this.result = this.initResult();
    this.vsAI = this.initVsAI();
    this.initAIModeEvents(this.vsAI);
    this.watchAI = this.initWatchAI();
    this.initAIModeEvents(this.watchAI.left);
    this.initAIModeEvents(this.watchAI.right);

    const font2 = new Rectangle("font2"); {
      font2.background = "black";
      font2.alpha = 0.4;
      this.ui.addControl(font2);
    }
    this.font2 = font2;

    this.login = this.initLogin();

    // this.menu.visibility(false);
    this.tournament.visibility(false);
    this.match.visibility(false);
    this.vsFriend.visibility(false);
    this.pause.visibility(false);
    this.result.visibility(false);
    this.vsAI.visibility(false);
    this.watchAI.visibility(false);

    this.login.visibility(false);
  }

  isStarted() {
    if (this.started)
      return this.startedType;
    return null;
  }

  goBack() {
    this.menu.visibility(false);
    this.vsFriend.visibility(false);
    this.tournament.visibility(false);
    this.pause.visibility(false);
    this.result.visibility(false);
    this.vsAI.visibility(false);
    this.watchAI.visibility(false);

    if (this.goBackUI == "menu") {
      this.goBackButton.isVisible = false;
      this.menu.visibility(true);
    } else if (this.goBackUI == "pause") {
      this.goBackButton.isVisible = false;
      this.pause.visibility(true);
    } else if (this.goBackUI == "result") {
      this.goBackButton.isVisible = false;
      this.result.visibility(true);
    }
  }

  private initMenu() {
    const menuTitle = new TextBlock("menuTitle", "MENU"); {
      menuTitle.width = 450 + "px";
      menuTitle.height = 200 + "px";
      menuTitle.top = "-180px";
      menuTitle.fontSize = 132 + "px";
      menuTitle.color = "white";
      this.ui.addControl(menuTitle);
    }

    const playLocalButton = Button.CreateSimpleButton("playLocalButton", "Play vs Friend"); {
      playLocalButton.width = 250 + "px";
      playLocalButton.height = 60 + "px";
      playLocalButton.top = "-70px";
      playLocalButton.fontSize = 32 + "px";
      playLocalButton.color = "white";
      playLocalButton.thickness = 0;
      playLocalButton.background = "transparent";
      playLocalButton.alpha = 0.5;
      playLocalButton.onPointerEnterObservable.add(() => {
        playLocalButton.color = "purple";
        playLocalButton.alpha = 1;
      });
      playLocalButton.onPointerOutObservable.add(() => {
        playLocalButton.color = "white";
        playLocalButton.alpha = 0.5;
      });
      playLocalButton.onPointerClickObservable.add(() => {
        this.menu.visibility(false);

        if (this.goBackButton.isVisible == true && this.goBackUI == "pause") { // TODO
          // delete and clear current match or tournament
          this.currentMatch = null;
          this.currentTournament = null;

        }
        this.goBackUI = "menu";
        this.goBackButton.isVisible = true;
        // As Guest or Login temporarily
        this.vsFriend.visibility(true);
      });
      this.ui.addControl(playLocalButton);
    }

    const playVSAIButton = Button.CreateSimpleButton("playVSAIButton", "Play vs AI"); {
      playVSAIButton.width = 250 + "px";
      playVSAIButton.height = 60 + "px";
      playVSAIButton.fontSize = 32 + "px";
      playVSAIButton.color = "white";
      playVSAIButton.thickness = 0;
      playVSAIButton.background = "transparent";
      playVSAIButton.alpha = 0.5;
      playVSAIButton.onPointerEnterObservable.add(() => {
        playVSAIButton.color = "purple";
        playVSAIButton.alpha = 1;
      });
      playVSAIButton.onPointerOutObservable.add(() => {
        playVSAIButton.color = "white";
        playVSAIButton.alpha = 0.5;
      });
      playVSAIButton.onPointerClickObservable.add(() => {
        this.menu.visibility(false);

        if (this.goBackButton.isVisible == true && this.goBackUI == "pause") { // TODO
          // delete and clear current match or tournament
          this.currentMatch = null;
          this.currentTournament = null;
        }
        this.goBackUI = "menu";
        this.goBackButton.isVisible = true;
        this.vsAI.visibility(true);
      });
      this.ui.addControl(playVSAIButton);
    }

    const tournamentButton = Button.CreateSimpleButton("tournamentButton", "Tournament"); {
      tournamentButton.width = 250 + "px";
      tournamentButton.height = 60 + "px";
      tournamentButton.top = "70px";
      tournamentButton.fontSize = 32 + "px";
      tournamentButton.color = "white";
      tournamentButton.thickness = 0;
      tournamentButton.background = "transparent";
      tournamentButton.alpha = 0.5;
      tournamentButton.onPointerEnterObservable.add(() => {
        tournamentButton.color = "purple";
        tournamentButton.alpha = 1;
      });
      tournamentButton.onPointerOutObservable.add(() => {
        tournamentButton.color = "white";
        tournamentButton.alpha = 0.5;
      });
      tournamentButton.onPointerClickObservable.add(() => {
        this.menu.visibility(false);

        if (this.goBackButton.isVisible == true && this.goBackUI == "pause") { // TODO
          // delete and clear current match or tournament
          this.currentMatch = null;
          this.currentTournament = null;
        }
        this.goBackUI = "menu";
        this.goBackButton.isVisible = true;
        this.tournament.visibility(true);
      });
      this.ui.addControl(tournamentButton);
    }

    const watchAIButton = Button.CreateSimpleButton("watchAIButton", "Watch AI"); {
      watchAIButton.width = 250 + "px";
      watchAIButton.height = 60 + "px";
      watchAIButton.top = "140px";
      watchAIButton.fontSize = 32 + "px";
      watchAIButton.color = "white";
      watchAIButton.thickness = 0;
      watchAIButton.background = "transparent";
      watchAIButton.alpha = 0.5;
      watchAIButton.onPointerEnterObservable.add(() => {
        watchAIButton.color = "purple";
        watchAIButton.alpha = 1;
      });
      watchAIButton.onPointerOutObservable.add(() => {
        watchAIButton.color = "white";
        watchAIButton.alpha = 0.5;
      });
      watchAIButton.onPointerClickObservable.add(() => {
        this.menu.visibility(false);

        if (this.goBackButton.isVisible == true && this.goBackUI == "pause") { // TODO
          // delete and clear current match or tournament
          this.currentMatch = null;
          this.currentTournament = null;
        }
        this.goBackUI = "menu";
        this.goBackButton.isVisible = true;
        this.watchAI.visibility(true);
      });
      this.ui.addControl(watchAIButton);
    }

    const quitButton = Button.CreateSimpleButton("quitButton", "Quit"); {
      quitButton.width = 250 + "px";
      quitButton.height = 60 + "px";
      quitButton.top = "220px";
      quitButton.fontSize = 38 + "px";
      quitButton.color = "white";
      quitButton.cornerRadius = 20;
      quitButton.thickness = 0;
      quitButton.background = "transparent";
      quitButton.alpha = 0.7;
      quitButton.onPointerEnterObservable.add(() => {
        quitButton.color = "red";
      });
      quitButton.onPointerOutObservable.add(() => {
        quitButton.color = "white";
      });
      quitButton.onPointerClickObservable.add(() => {
        this.menu.visibility(true);
        navigate("/select-game");
      });
      this.ui.addControl(quitButton);
    }

    const visibility = (visible: boolean) => {
      Object.values(this.menu).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.font.isVisible = visible;
      if (visible) {
        this.startedType = { type: "ended" };
        if (this.currentTournament) {
          deleteTournament(this.currentTournament.id);
          this.currentTournament = null;
          this.rounds = {};
          this.currentRoundIndex = 0;
          this.currentMatch = null;
        } else if (this.currentMatch) {
          deleteMatch(this.currentMatch.id);
          this.currentMatch = null;
        }
      }
    };

    return {
      title: menuTitle,
      local: playLocalButton,
      vsAI: playVSAIButton,
      tournament: tournamentButton,
      watchAI: watchAIButton,
      quit: quitButton,
      visibility
    };
  }

  private initVSFriend() {
    const title = new TextBlock("title", "VS FRIEND"); {
      title.width = 600 + "px";
      title.height = 130 + "px";
      title.top = "-100px";
      title.fontSize = 72 + "px";
      title.color = "white";
      this.ui.addControl(title);
    }

    const loginButton = Button.CreateSimpleButton("loginButton", "Login"); {
      loginButton.width = 200 + "px";
      loginButton.height = 60 + "px";
      loginButton.top = "50px";
      loginButton.left = "-100px";
      loginButton.fontSize = 32 + "px";
      loginButton.color = "white";
      loginButton.cornerRadius = 20;
      loginButton.thickness = 0;
      loginButton.background = "transparent";
      loginButton.alpha = 0.5;
      loginButton.onPointerEnterObservable.add(() => {
        loginButton.color = "purple";
        loginButton.alpha = 1;
      });
      loginButton.onPointerOutObservable.add(() => {
        loginButton.color = "white";
        loginButton.alpha = 0.5;
      });
      loginButton.onPointerClickObservable.add(() => {
        this.login.visibility(true);
      });
      this.ui.addControl(loginButton);
    }

    const guestButton = Button.CreateSimpleButton("guestButton", "Guest"); {
      guestButton.width = 200 + "px";
      guestButton.height = 60 + "px";
      guestButton.top = "50px";
      guestButton.left = "100px";
      guestButton.fontSize = 32 + "px";
      guestButton.color = "white";
      guestButton.cornerRadius = 20;
      guestButton.thickness = 0;
      guestButton.background = "transparent";
      guestButton.alpha = 0.5;
      guestButton.onPointerEnterObservable.add(() => {
        guestButton.color = "purple";
        guestButton.alpha = 1;
      });
      guestButton.onPointerOutObservable.add(() => {
        guestButton.color = "white";
        guestButton.alpha = 0.5;
      });
      guestButton.onPointerClickObservable.add(() => {
        createMatch("guest").then((match) => {
          if (match == null) return;
          this.currentMatch = match;
          this.vsFriend.visibility(false);
          this.startedType = { type: "local" };
          this.match.visibility(true, this.currentMatch.player1.name, this.currentMatch.player2.name);
        });
      });
      this.ui.addControl(guestButton);
    }

    const visibility = (visible: boolean) => {
      Object.values(this.vsFriend).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.font.isVisible = visible;
      this.goBackButton.isVisible = visible;
    };

    return {
      title,
      login: loginButton,
      guest: guestButton,
      visibility
    };
  }

  private initTournament() {
    const tournamentTitle = new TextBlock("tournamentTitle", "TOURNAMENT"); {
      tournamentTitle.width = 600 + "px";
      tournamentTitle.height = 130 + "px";
      tournamentTitle.top = "-250px";
      tournamentTitle.fontSize = 72 + "px";
      tournamentTitle.color = "white";
      this.ui.addControl(tournamentTitle);
    }

    const hostText = new TextBlock("hostText", "Host:"); {
      hostText.width = 200 + "px";
      hostText.height = 60 + "px";
      hostText.top = "-150px";
      hostText.left = "-250px";
      hostText.fontSize = 32 + "px";
      hostText.color = "white";
      this.ui.addControl(hostText);
    }

    const hostPlayer = new TextBlock("hostPlayer", this.hostPlayer); {
      hostPlayer.width = 200 + "px";
      hostPlayer.height = 60 + "px";
      hostPlayer.top = "-150px";
      hostPlayer.left = "-125px";
      hostPlayer.fontSize = 42 + "px";
      hostPlayer.color = "purple";
      this.ui.addControl(hostPlayer);
    }

    const selectSizeText = new TextBlock("selectSizeText", "Select Size:"); {
      selectSizeText.width = 200 + "px";
      selectSizeText.height = 100 + "px";
      selectSizeText.top = "-150px";
      selectSizeText.left = "110px";
      selectSizeText.fontSize = 38 + "px";
      selectSizeText.color = "white";
      this.ui.addControl(selectSizeText);
    }

    const size4Text = new TextBlock("size4Text", "4 Players"); {
      size4Text.width = 200 + "px";
      size4Text.height = 60 + "px";
      size4Text.top = "-50px";
      size4Text.left = "110px";
      size4Text.fontSize = 32 + "px";
      size4Text.color = "white";
      size4Text.alpha = 0.5;
      size4Text.onPointerEnterObservable.add(() => {
        size4Text.alpha = 1;
      });
      size4Text.onPointerOutObservable.add(() => {
        size4Text.alpha = 0.5;
      });
      size4Text.onPointerClickObservable.add(() => {
        this.tournament.switchToPlayersSetting(4);
      });
      this.ui.addControl(size4Text);
    }

    const size8Text = new TextBlock("size8Text", "8 Players"); {
      size8Text.width = 200 + "px";
      size8Text.height = 60 + "px";
      size8Text.top = "25px";
      size8Text.left = "110px";
      size8Text.fontSize = 32 + "px";
      size8Text.color = "white";
      size8Text.alpha = 0.5;
      size8Text.onPointerEnterObservable.add(() => {
        size8Text.alpha = 1;
      });
      size8Text.onPointerOutObservable.add(() => {
        size8Text.alpha = 0.5;
      });
      size8Text.onPointerClickObservable.add(() => {
        this.tournament.switchToPlayersSetting(8);
      });
      this.ui.addControl(size8Text);
    }

    const size16Text = new TextBlock("size16Text", "16 Players"); {
      size16Text.width = 200 + "px";
      size16Text.height = 60 + "px";
      size16Text.top = "100px";
      size16Text.left = "110px";
      size16Text.fontSize = 32 + "px";
      size16Text.color = "white";
      size16Text.alpha = 0.5;
      size16Text.onPointerEnterObservable.add(() => {
        size16Text.alpha = 1;
      });
      size16Text.onPointerOutObservable.add(() => {
        size16Text.alpha = 0.5;
      });
      size16Text.onPointerClickObservable.add(() => {
        this.tournament.switchToPlayersSetting(16);
      });
      this.ui.addControl(size16Text);
    }

    const switchToPlayersSetting = (nbOfPlayers: number) => {
      launchTournament(nbOfPlayers).then((tournament) => {
        //console.log("launchTournament data ->", tournament);
        if (!tournament) {
          console.error("Tournament creation failed");
          return;
        }

        this.currentTournament = tournament;
        //console.log("Current tournament set to:", this.currentTournament);
        // Hide size selection
        this.tournament.selectSize.isVisible = false;
        this.tournament.size4.isVisible = false;
        this.tournament.size8.isVisible = false;
        this.tournament.size16.isVisible = false;
  
        // Show players setting and Start button
  
        this.tournament.playersScrollViewer.players.forEach((playerText) => {
          this.tournament.playersScrollViewer.playersBlock.removeControl(playerText);
          playerText.dispose();
        });
        this.tournament.playersScrollViewer.players = [];
        this.tournament.playersScrollViewer.playersBlock.height = "0px";
        this.tournament.playersScrollViewer.scrollViewer.isVisible = true;
        this.tournament.addLogin.isVisible = true;
        this.tournament.addGuest.isVisible = true;
        this.tournament.numberOfAI.text = `Number of AI: ${nbOfPlayers - 1}`;
        this.tournament.numberOfAI.isVisible = true;
        this.tournament.start.isVisible = true;
      });
    };

    const addLoginButton = Button.CreateSimpleButton("addLoginButton", "Add Login"); {
      addLoginButton.width = 200 + "px";
      addLoginButton.height = 60 + "px";
      addLoginButton.top = "-75px";
      addLoginButton.left = "-150px";
      addLoginButton.fontSize = 32 + "px";
      addLoginButton.color = "white";
      addLoginButton.thickness = 0;
      addLoginButton.background = "transparent";
      addLoginButton.alpha = 0.5;
      addLoginButton.onPointerEnterObservable.add(() => {
        addLoginButton.alpha = 1;
      });
      addLoginButton.onPointerOutObservable.add(() => {
        addLoginButton.alpha = 0.5;
      });
      addLoginButton.onPointerClickObservable.add(() => {
        // Add Login player
        if (this.currentTournament == null) return;
        this.login.visibility(true);
      });
      this.ui.addControl(addLoginButton);
    }

    const addGuestButton = Button.CreateSimpleButton("addGuestButton", "Add Guest"); {
      addGuestButton.width = 200 + "px";
      addGuestButton.height = 60 + "px";
      // addGuestButton.top = "25px";
      addGuestButton.left = "-150px";
      addGuestButton.fontSize = 32 + "px";
      addGuestButton.color = "white";
      addGuestButton.thickness = 0;
      addGuestButton.background = "transparent";
      addGuestButton.alpha = 0.5;
      addGuestButton.onPointerEnterObservable.add(() => {
        addGuestButton.alpha = 1;
      });
      addGuestButton.onPointerOutObservable.add(() => {
        addGuestButton.alpha = 0.5;
      });
      addGuestButton.onPointerClickObservable.add(() => {
        // Add Guest player
        if (this.currentTournament == null) return;
        joinTournamentAsGuest(this.currentTournament.id).then((player) => {
          if ('error' in player) {
            popUpAlert("Error", `${player.error}`)
            console.error(player.error);
            return;
          }
            this.tournament.addPlayer(player);
          if (player.message != "Joined tournament"){
            // alert("Error");
            popUpAlert("Error", player.message)
          }
        });
      });
      this.ui.addControl(addGuestButton);
    }

    const numberOfAIText = new TextBlock("numberOfAIText", "Number of AI: 0"); {
      numberOfAIText.width = 400 + "px";
      numberOfAIText.height = 100 + "px";
      numberOfAIText.top = "100px";
      numberOfAIText.fontSize = 28 + "px";
      numberOfAIText.color = "white";
      numberOfAIText.left = "-150px";
      numberOfAIText.alpha = 0.7;
      this.ui.addControl(numberOfAIText);
    }

    const playersScrollViewer = new ScrollViewer("playersScrollViewer"); {
      playersScrollViewer.width = 200 + "px";
      playersScrollViewer.height = 410 + "px";
      playersScrollViewer.left = "110px";
      playersScrollViewer.barSize = 5;
      playersScrollViewer.barColor = "white";
      playersScrollViewer.background = "transparent";
      playersScrollViewer.thickness = 0;
      this.ui.addControl(playersScrollViewer);
    }

    const playersTitle = new TextBlock("playersTitle", "Players:"); {
      playersTitle.parent = playersScrollViewer;
      playersTitle.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      playersTitle.width = "100%";
      playersTitle.height = "50px";
      playersTitle.top = "20px";
      playersTitle.fontSize = 38 + "px";
      playersTitle.color = "white";
      playersScrollViewer.addControl(playersTitle);
    }

    const playersBlock = new Rectangle("playersBlock"); {
      playersBlock.parent = playersScrollViewer;
      playersBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      playersBlock.width = "100%";
      playersBlock.height = "0px";
      playersBlock.top = "80px";
      playersBlock.left = "10px";
      playersBlock.color = "transparent";
      playersScrollViewer.addControl(playersBlock);
    }

    const addPlayer = (player: { id: string, name: string }) => {
      if (!this.currentTournament) return;
      const playerText = new TextBlock(`player${this.tournament.playersScrollViewer.players.length}`, player.name); {
        playerText.parent = this.tournament.playersScrollViewer.playersBlock;
        playerText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        playerText.width = "100%";
        playerText.height = "50px";
        playerText.top = `${this.tournament.playersScrollViewer.players.length * 50}px`;
        playerText.left = "10px";
        playerText.fontSize = 28 + "px";
        playerText.color = "white";
      }
      this.tournament.playersScrollViewer.players.push(playerText);
      this.tournament.playersScrollViewer.playersBlock.height = `${this.tournament.playersScrollViewer.players.length * 55}px`;
      this.tournament.playersScrollViewer.playersBlock.addControl(playerText);
      const remainingPlaces = this.currentTournament.nbPlayersTotal - this.tournament.playersScrollViewer.players.length - 1;
      this.tournament.numberOfAI.text = `Number of AI: ${remainingPlaces}`;
      if (!remainingPlaces) {
        this.tournament.addLogin.isVisible = false;
        this.tournament.addGuest.isVisible = false;
      }
    };

    const startButton = Button.CreateSimpleButton("startButton", "Start"); {
      startButton.width = 300 + "px";
      startButton.height = 70 + "px";
      startButton.top = "200px";
      startButton.left = "-50px";
      startButton.fontSize = 42 + "px";
      startButton.color = "white";
      startButton.cornerRadius = 20;
      startButton.thickness = 0;
      startButton.background = "transparent";
      startButton.alpha = 0.7;
      startButton.onPointerEnterObservable.add(() => {
        startButton.alpha = 1;
      });
      startButton.onPointerOutObservable.add(() => {
        startButton.alpha = 0.7;
      });
      startButton.onPointerClickObservable.add(() => {
        // Start tournament
        if (this.currentTournament == null) return;
        startTournament(this.currentTournament.id).then((tournament) => {
          if (tournament == null) return;
          this.currentTournament = tournament;
          this.rounds[0] = this.currentTournament.matches;
          this.currentMatch = this.rounds[0][0];
          this.tournament.visibility(false);
          this.goBackButton.isVisible = false;
          if (this.currentMatch.player1.type === "ia" && this.currentMatch.player2.type === "ia")
            this.startedType = { type: "watchAI", aiMode1: "normal", aiMode2: "normal" };
          else if (this.currentMatch.player1.type === "ia")
            this.startedType = { type: "vsAI", aiMode1: "normal" };
          else if (this.currentMatch.player2.type === "ia")
            this.startedType = { type: "vsAI", aiMode2: "normal" };
          else
            this.startedType = { type: "local" };
          this.match.visibility(true,
            this.currentMatch.player1.name ? this.currentMatch.player1.name : "normalAI",
            this.currentMatch.player2.name ? this.currentMatch.player2.name : "normalAI"
          );
        });
      });
      this.ui.addControl(startButton);
    }

    const visibility = (visible: boolean) => {
      Object.values(this.tournament).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.tournament.playersScrollViewer.scrollViewer.isVisible = visible;
      this.font.isVisible = visible;
      if (visible) {
        this.tournament.addLogin.isVisible = false;
        this.tournament.addGuest.isVisible = false;
        this.tournament.numberOfAI.isVisible = false;
        this.tournament.playersScrollViewer.scrollViewer.isVisible = false;
        this.tournament.start.isVisible = false;
      }
    };

    const showBracket = (winnerName: string) => {
      this.font.isVisible = true;

      const TournamentBracketTitle = new TextBlock("tournamentBracketTitle", "TOURNAMENT BRACKET"); {
        TournamentBracketTitle.width = 1000 + "px";
        TournamentBracketTitle.height = 180 + "px";
        TournamentBracketTitle.top = "-250px";
        TournamentBracketTitle.fontSize = 80 + "px";
        TournamentBracketTitle.color = "white";
        this.ui.addControl(TournamentBracketTitle);
      }

      const winnerText = new TextBlock("winnerText", `Winner: ${winnerName}`); {
        winnerText.width = "100%";
        winnerText.height = "50px";
        winnerText.top = "-175px";
        winnerText.fontSize = 36 + "px";
        winnerText.color = "yellow";
        this.ui.addControl(winnerText);
      }

      let roundIndex = 0;
      const matchBlocks: Rectangle[] = [];

      const createMatchBlock = (match: any, x: number, y: number): Rectangle => {
        const matchBlock = new Rectangle(`tournamentMatchBlock_${match.id}`); {
          matchBlock.width = (x ? 140 : 400) + "px";
          matchBlock.height = 80 + "px";
          matchBlock.left = `${x}px`;
          matchBlock.top = `${y}px`;
          matchBlock.thickness = 0;
          this.ui.addControl(matchBlock);
        }

        const player1Text = new TextBlock(`tournamentPlayer1Text_${match.id}`, match.player1.name ? match.player1.name : "normalAI"); {
          player1Text.parent = matchBlock;
          player1Text.width = "100%";
          player1Text.height = "50%";
          if (x)
            player1Text.top = "-30px";
          else
            player1Text.left = "-120px";
          player1Text.fontSize = (x ? 28 : 32) + "px";
          player1Text.color = "purple";
          matchBlock.addControl(player1Text);
        }

        const vsText = new TextBlock(`tournamentVSText_${match.id}`, "VS"); {
          vsText.parent = matchBlock;
          vsText.width = "100%";
          vsText.height = "30px";
          vsText.fontSize = (x ? 18 : 32) + "px";
          vsText.fontStyle = "italic";
          vsText.color = "green";
          matchBlock.addControl(vsText);
        }

        const player2Text = new TextBlock(`tournamentPlayer2Text_${match.id}`, match.player2.name ? match.player2.name : "normalAI"); {
          player2Text.parent = matchBlock;
          player2Text.width = "100%";
          player2Text.height = "50%";
          if (x)
            player2Text.top = "30px";
          else
            player2Text.left = "120px";
          player2Text.fontSize = (x ? 28 : 32) + "px";
          player2Text.color = "purple";
          matchBlock.addControl(player2Text);
        }

        return matchBlock;
      };

      const createRound = (roundIdx: number, roundY: number, stepX: number, blocks: Rectangle[]) => {
        let roundX = this.rounds[roundIdx].length / 2 * -stepX + stepX / 2;
        for (const match of this.rounds[roundIdx]) {
          blocks.push(createMatchBlock(match, roundX, roundY));
          roundX += stepX;
        }
      };

      switch (this.rounds[0].length) { // fallthrough to create all rounds for selected size
        case 8:
          createRound(roundIndex, 200, 150, matchBlocks);
          roundIndex++;
        case 4:
          createRound(roundIndex, 100, 260, matchBlocks);
          roundIndex++;
        case 2:
          createRound(roundIndex, 0, 450, matchBlocks);
          roundIndex++;
      };
      matchBlocks.push(createMatchBlock(this.rounds[roundIndex][0], 0, -100));

      const menuButton = Button.CreateSimpleButton("menuButton", "Menu"); {
        menuButton.width = 250 + "px";
        menuButton.height = 60 + "px";
        menuButton.top = "300px";
        menuButton.fontSize = 32 + "px";
        menuButton.color = "white";
        menuButton.thickness = 0;
        menuButton.background = "transparent";
        menuButton.alpha = 0.5;
        menuButton.onPointerEnterObservable.add(() => {
          menuButton.color = "purple";
          menuButton.alpha = 1;
        });
        menuButton.onPointerOutObservable.add(() => {
          menuButton.color = "white";
          menuButton.alpha = 0.5;
        });
        menuButton.onPointerClickObservable.add(() => {
          TournamentBracketTitle.dispose();
          winnerText.dispose();
          matchBlocks.forEach((block) => block.dispose());
          menuButton.dispose();
          this.menu.visibility(true);
        });
        this.ui.addControl(menuButton);
      }

      this.rounds = {};
      this.currentRoundIndex = 0;
    }

    return {
      title: tournamentTitle,
      host: hostText,
      hostPlayer: hostPlayer,
      selectSize: selectSizeText,
      size4: size4Text,
      size8: size8Text,
      size16: size16Text,
      switchToPlayersSetting,
      addGuest: addGuestButton,
      addLogin: addLoginButton,
      numberOfAI: numberOfAIText,
      playersScrollViewer: {
        scrollViewer: playersScrollViewer,
        title: playersTitle,
        playersBlock: playersBlock,
        players: [],
        isVisible: false
      },
      addPlayer,
      start: startButton,
      showBracket,
      visibility
    }
  }

  private initMatch() {
    const matchBlock = new Rectangle("matchBlock"); {
      matchBlock.width = 600 + "px";
      matchBlock.height = 300 + "px";
      this.ui.addControl(matchBlock);
    }

    const matchTitle = new TextBlock("matchTitle", "MATCH"); {
      matchTitle.parent = matchBlock;
      matchTitle.width = 400 + "px";
      matchTitle.height = 100 + "px";
      matchTitle.top = "-100px";
      matchTitle.fontSize = 72 + "px";
      matchTitle.color = "white";
      matchBlock.addControl(matchTitle);
    }

    const player1Text = new TextBlock("player1Text", "Player 1"); {
      player1Text.parent = matchBlock;
      player1Text.width = 200 + "px";
      player1Text.height = 80 + "px";
      player1Text.left = "-150px";
      player1Text.fontSize = 42 + "px";
      player1Text.color = "purple";
      matchBlock.addControl(player1Text);
    }

    const vsText = new TextBlock("vsText", "VS"); {
      vsText.parent = matchBlock;
      vsText.width = 100 + "px";
      vsText.height = 80 + "px";
      vsText.fontSize = 42 + "px";
      vsText.fontStyle = "italic";
      vsText.color = "green";
      matchBlock.addControl(vsText);
    }

    const player2Text = new TextBlock("player2Text", "Player 2"); {
      player2Text.parent = matchBlock;
      player2Text.width = 200 + "px";
      player2Text.height = 80 + "px";
      player2Text.left = "150px";
      player2Text.fontSize = 42 + "px";
      player2Text.color = "purple";
      matchBlock.addControl(player2Text);
    }

    const playButton = Button.CreateSimpleButton("playButton", "Play"); {
      playButton.parent = matchBlock;
      playButton.width = 200 + "px";
      playButton.height = 70 + "px";
      playButton.top = "100px";
      playButton.fontSize = 42 + "px";
      playButton.color = "white";
      playButton.cornerRadius = 20;
      playButton.thickness = 0;
      playButton.background = "transparent";
      playButton.alpha = 0.7;
      playButton.onPointerEnterObservable.add(() => {
        playButton.alpha = 1;
      });
      playButton.onPointerOutObservable.add(() => {
        playButton.alpha = 0.7;
      });
      playButton.onPointerClickObservable.add(() => {
        // Start match
        if (this.currentMatch == null && this.startedType?.type !== "watchAI") return;
        this.match.visibility(false);
        this.started = true;
      });
      matchBlock.addControl(playButton);
    }

    const visibility = (visible: boolean, player1?: string, player2?: string) => {
      Object.values(this.match).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      if (visible) {
        // reset score
        this.score.update("left", 0);
        this.score.update("right", 0);
        if (player1 && player2) {
          player1Text.text = player1;
          player2Text.text = player2;
          this.panel.visibility(true);
        }
      }
    };

    return {
      matchBlock,
      title: matchTitle,
      player1: player1Text,
      player2: player2Text,
      constVS: vsText,
      play: playButton,
      visibility
    }
  }

  private initPause() {
    const pauseTitle = new TextBlock("pauseTitle", "PAUSE"); {
      pauseTitle.width = 450 + "px";
      pauseTitle.height = 180 + "px";
      pauseTitle.top = "-200px";
      pauseTitle.fontSize = 132 + "px";
      pauseTitle.color = "white";
      this.ui.addControl(pauseTitle);
    }
    
    const resumeButton = Button.CreateSimpleButton("resumeButton", "Resume"); {
      resumeButton.width = 250 + "px";
      resumeButton.height = 60 + "px";
      resumeButton.top = "-50px";
      resumeButton.fontSize = 42 + "px";
      resumeButton.color = "white";
      resumeButton.thickness = 0;
      resumeButton.background = "transparent";
      resumeButton.alpha = 0.5;
      resumeButton.onPointerEnterObservable.add(() => {
        resumeButton.color = "purple";
        resumeButton.alpha = 1;
      });
      resumeButton.onPointerOutObservable.add(() => {
        resumeButton.color = "white";
        resumeButton.alpha = 0.5;
      });
      resumeButton.onPointerClickObservable.add(() => {
        this.pause.visibility(false);
      });
      this.ui.addControl(resumeButton);
    }

    const menuButton = Button.CreateSimpleButton("menuButton", "Menu"); {
      menuButton.width = 250 + "px";
      menuButton.height = 60 + "px";
      menuButton.top = "35px";
      menuButton.fontSize = 32 + "px";
      menuButton.color = "white";
      menuButton.thickness = 0;
      menuButton.background = "transparent";
      menuButton.alpha = 0.5;
      menuButton.onPointerEnterObservable.add(() => {
        menuButton.color = "purple";
        menuButton.alpha = 1;
      });
      menuButton.onPointerOutObservable.add(() => {
        menuButton.color = "white";
        menuButton.alpha = 0.5;
      });
      menuButton.onPointerClickObservable.add(() => {

        this.pause.visibility(false);
        // this.goBackUI = "pause";
        // this.goBackButton.isVisible = true;
        this.menu.visibility(true);
      });
      this.ui.addControl(menuButton);
    }

    const quitButton = Button.CreateSimpleButton("quitButton", "Quit"); {
      quitButton.width = 250 + "px";
      quitButton.height = 60 + "px";
      quitButton.top = "115px";
      quitButton.fontSize = 38 + "px";
      quitButton.color = "white";
      quitButton.cornerRadius = 20;
      quitButton.thickness = 0;
      quitButton.background = "transparent";
      quitButton.alpha = 0.7;
      quitButton.onPointerEnterObservable.add(() => {
        quitButton.color = "red";
      });
      quitButton.onPointerOutObservable.add(() => {
        quitButton.color = "white";
      });
      quitButton.onPointerClickObservable.add(() => {
        this.menu.visibility(true);
        navigate("/select-game");
      });
      this.ui.addControl(quitButton);
    }

    const isPaused = () => {
      if (this.pause.title.isVisible || (this.goBackUI == "pause" && this.goBackButton.isVisible))
        return true;
      return false;
    };

    const visibility = (visible: boolean) => {
      Object.values(this.pause).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.font.isVisible = visible;

      if (!visible && this.goBackUI == "pause" && this.goBackButton.isVisible) {
        this.goBackButton.isVisible = false;
        this.menu.visibility(false);
      }
    };

    return {
      title: pauseTitle,
      resume: resumeButton,
      menu: menuButton,
      quit: quitButton,
      isPaused,
      visibility
    }
  }

  private initResult() {
    const resultTitle = new TextBlock("resultTitle", "RESULT"); {
      resultTitle.width = 500 + "px";
      resultTitle.height = 200 + "px";
      resultTitle.top = "-180px";
      resultTitle.fontSize = 132 + "px";
      resultTitle.color = "white";
      this.ui.addControl(resultTitle);
    }

    const playerText = new TextBlock("playerText", "Player"); {
      playerText.width = 300 + "px";
      playerText.height = 80 + "px";
      playerText.left = "-120px";
      playerText.color = "purple";
      playerText.fontSize = 52 + "px";
      this.ui.addControl(playerText);
    }

    const winsText = new TextBlock("winsText", "Wins"); {
      winsText.width = 300 + "px";
      winsText.height = 100 + "px";
      winsText.left = "100px";
      winsText.color = "green";
      winsText.fontSize = 82 + "px";
      winsText.fontWeight = "bold";
      this.ui.addControl(winsText);
    }

    const nextMatchButton = Button.CreateSimpleButton("nextMatchButton", "Next Match"); {
      nextMatchButton.width = 300 + "px";
      nextMatchButton.height = 60 + "px";
      nextMatchButton.top = "100px";
      nextMatchButton.fontSize = 32 + "px";
      nextMatchButton.color = "white";
      nextMatchButton.thickness = 0;
      nextMatchButton.background = "transparent";
      nextMatchButton.alpha = 0.5;
      nextMatchButton.isVisible = false;
      nextMatchButton.onPointerEnterObservable.add(() => {
        nextMatchButton.color = "purple";
        nextMatchButton.alpha = 1;
      });
      nextMatchButton.onPointerOutObservable.add(() => {
        nextMatchButton.color = "white";
        nextMatchButton.alpha = 0.5;
      });
      nextMatchButton.onPointerClickObservable.add(() => {
        //console.log("currentTournament in next button:", this.currentTournament);
        if (this.currentTournament == null || !this.currentTournament.matches?.length) return;
        //console.log("matches inside tournament:", this.currentTournament?.matches);
        this.currentMatch = this.currentTournament.matches[this.currentMatchIndex];
        //console.log("currentMatch:", this.currentMatch);
        if (this.currentMatch == null) return;
        this.result.visibility(false);
        this.panel.winParts.player1.text = "0";
        this.panel.winParts.player2.text = "0";
        if (this.currentMatch.player1.type === "ia" && this.currentMatch.player2.type === "ia")
          this.startedType = { type: "watchAI", aiMode1: "normal", aiMode2: "normal" };
        else if (this.currentMatch.player1.type === "ia")
          this.startedType = { type: "vsAI", aiMode1: "normal" };
        else if (this.currentMatch.player2.type === "ia")
          this.startedType = { type: "vsAI", aiMode2: "normal" };
        else
          this.startedType = { type: "local" };
        this.match.visibility(true,
          this.currentMatch.player1.name ? this.currentMatch.player1.name : "normalAI",
          this.currentMatch.player2.name ? this.currentMatch.player2.name : "normalAI"
        );
      });
      this.ui.addControl(nextMatchButton);
    }

    const menuButton = Button.CreateSimpleButton("menuButton", "Menu"); {
      menuButton.width = 300 + "px";
      menuButton.height = 60 + "px";
      menuButton.top = "170px";
      menuButton.fontSize = 42 + "px";
      menuButton.color = "white";
      menuButton.thickness = 0;
      menuButton.background = "transparent";
      menuButton.alpha = 0.5;
      menuButton.onPointerEnterObservable.add(() => {
        menuButton.color = "purple";
        menuButton.alpha = 1;
      });
      menuButton.onPointerOutObservable.add(() => {
        menuButton.color = "white";
        menuButton.alpha = 0.5;
      });
      menuButton.onPointerClickObservable.add(() => {
        this.panel.winParts.player1.text = "0";
        this.panel.winParts.player2.text = "0";
        this.result.visibility(false);
        this.menu.visibility(true);

      });
      this.ui.addControl(menuButton);
    }

    const show = () => {
      if (!this.started) return;
      this.started = false;
      // update win parts
      if (this.score.left.text > this.score.right.text) {
        this.panel.winParts.player2.text = (parseInt(this.panel.winParts.player2.text) + 1).toString();
		    this.result.player.text = this.panel.players.player2;
      } else {
        this.panel.winParts.player1.text = (parseInt(this.panel.winParts.player1.text) + 1).toString();
        this.result.player.text = this.panel.players.player1;
      }

      if (this.currentTournament && this.currentMatch) {
		    //console.log("match: ", this.currentMatch);
        nextTournamentMatch(parseInt(this.score.left.text), parseInt(this.score.right.text), this.currentMatch).then((data) => {
          if (!data || !this.currentTournament) {
            this.currentTournament = null;
          } else if (data.message === "All matchs round not finished"){
            //console.log("En attente des autres matchs du round...");
            this.currentMatchIndex++;
          } else if (data.message === "next round") {
            //console.log("before this.currentTournament value:", this.currentTournament);
            this.currentTournament.matches = data.matches;
            this.rounds[++this.currentRoundIndex] = this.currentTournament.matches;
            this.currentMatchIndex = 0;
            //console.log("backend matches:", data.matches || data.matchs);
            //console.log("After this.currentTournament value :", this.currentTournament);
          } else if (data.message === "Tournament ended") {
            this.currentTournament = null;
            this.currentMatch = null;
            this.tournament.showBracket(data.winner.name ? data.winner.name : "normalAI");
            return;
          }
          this.result.visibility(true);
        });
      } else if (this.currentMatch) {
        updateMatchResult(parseInt(this.score.left.text), parseInt(this.score.right.text), this.currentMatch);
        this.result.visibility(true);
      } else
        this.result.visibility(true);

      this.currentMatch = null;
      return;
    };

    const visibility = (visible: boolean) => {
      Object.values(this.result).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.font.isVisible = visible;
      if (visible) {
        if (!this.currentTournament) {
          this.result.nextMatch.isVisible = false;
        }
        if (this.score.left.text > this.score.right.text) {
          this.result.player.text = this.panel.players.player1.text;
        } else {
          this.result.player.text = this.panel.players.player2.text;
        }
      }
    };

    return {
      title: resultTitle,
      player: playerText,
      wins: winsText,
      nextMatch: nextMatchButton,
      menu: menuButton,
      show,
      visibility
    };
  }

  private initAIMode(offsetX?: number, side?: string) {
    const AIModeTitle = new TextBlock("AIModeTitle", (side ? side : "") + "AI Mode:"); {
      AIModeTitle.width = 400 + "px";
      AIModeTitle.height = 100 + "px";
      AIModeTitle.top = "-150px";
      AIModeTitle.left = offsetX ? `${offsetX}px` : "0px";
      AIModeTitle.fontSize = 48 + "px";
      AIModeTitle.color = "white";
      this.ui.addControl(AIModeTitle);
    }

    const normalButton = Button.CreateSimpleButton("normalButton", "Normal"); {
      normalButton.width = 200 + "px";
      normalButton.height = 60 + "px";
      normalButton.top = "-50px";
      normalButton.left = offsetX ? `${offsetX}px` : "0px";
      normalButton.fontSize = 32 + "px";
      normalButton.color = "white";
      normalButton.thickness = 0;
      normalButton.background = "transparent";
      normalButton.alpha = 0.5;
      this.ui.addControl(normalButton);
    }

    const restlessButton = Button.CreateSimpleButton("restlessButton", "Restless"); {
      restlessButton.width = 200 + "px";
      restlessButton.height = 60 + "px";
      restlessButton.top = "25px";
      restlessButton.left = offsetX ? `${offsetX}px` : "0px";
      restlessButton.fontSize = 32 + "px";
      restlessButton.color = "white";
      restlessButton.thickness = 0;
      restlessButton.background = "transparent";
      restlessButton.alpha = 0.5;
      this.ui.addControl(restlessButton);
    }

    const smartButton = Button.CreateSimpleButton("smartButton", "Smart"); {
      smartButton.width = 200 + "px";
      smartButton.height = 60 + "px";
      smartButton.top = "100px";
      smartButton.left = offsetX ? `${offsetX}px` : "0px";
      smartButton.fontSize = 32 + "px";
      smartButton.color = "white";
      smartButton.thickness = 0;
      smartButton.background = "transparent";
      smartButton.alpha = 0.5;
      this.ui.addControl(smartButton);
    }

    return {
      title: AIModeTitle,
      selectedAIMode: "",
      restless: restlessButton,
      normal: normalButton,
      smart: smartButton
    };
  }

  private initAIModeEvents(obj: any) {
    obj.normal.onPointerEnterObservable.add(() => {
      obj.normal.alpha = 1;
    });
    obj.normal.onPointerOutObservable.add(() => {
      if (obj.selectedAIMode !== "normal")
        obj.normal.alpha = 0.5;
    });
    obj.normal.onPointerClickObservable.add(() => {
      if (obj.selectedAIMode !== "normal") {
        obj.restless.alpha = 0.5;
        obj.smart.alpha = 0.5;
        obj.selectedAIMode = "normal";
      }
    });

    obj.restless.onPointerEnterObservable.add(() => {
      obj.restless.alpha = 1;
    });
    obj.restless.onPointerOutObservable.add(() => {
      if (obj.selectedAIMode !== "restless")
        obj.restless.alpha = 0.5;
    });
    obj.restless.onPointerClickObservable.add(() => {
      if (obj.selectedAIMode !== "restless") {
        obj.normal.alpha = 0.5;
        obj.smart.alpha = 0.5;
        obj.selectedAIMode = "restless";
      }
    });

    obj.smart.onPointerEnterObservable.add(() => {
      obj.smart.alpha = 1;
    });
    obj.smart.onPointerOutObservable.add(() => {
      if (obj.selectedAIMode !== "smart")
        obj.smart.alpha = 0.5;
    });
    obj.smart.onPointerClickObservable.add(() => {
      if (obj.selectedAIMode !== "smart") {
        obj.restless.alpha = 0.5;
        obj.normal.alpha = 0.5;
        obj.selectedAIMode = "smart";
      }
    });
  }

  private initVsAI() {
    const AIMode = this.initAIMode();

    const startButton = Button.CreateSimpleButton("startButton", "Start"); {
      startButton.width = 200 + "px";
      startButton.height = 60 + "px";
      startButton.top = "200px";
      startButton.fontSize = 42 + "px";
      startButton.color = "green";
      startButton.thickness = 0;
      startButton.background = "transparent";
      startButton.alpha = 0.7;
      startButton.onPointerEnterObservable.add(() => {
        startButton.alpha = 1;
      });
      startButton.onPointerOutObservable.add(() => {
        startButton.alpha = 0.7;
      });
      startButton.onPointerClickObservable.add(() => {
        // Start match vs AI
        Object.values(AIMode).forEach((obj) => {
          if (obj.alpha === 1) {
            AIMode.selectedAIMode = obj === AIMode.restless ? "restless" : obj === AIMode.normal ? "normal" : "smart";
          }
        });
        if (AIMode.selectedAIMode === "") return;
        createMatch("ia").then((match) => {
          if (match == null) return;
          this.currentMatch = match;
          this.vsAI.visibility(false);
          this.startedType = { type: "vsAI", aiMode2: AIMode.selectedAIMode };
          this.match.visibility(true, this.currentMatch.player1.name, AIMode.selectedAIMode + "AI");
        });
      });
      this.ui.addControl(startButton);
    }

    const visibility = (visible: boolean) => {
      Object.values(this.vsAI).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.font.isVisible = visible;
      if (visible) {
        // Reset AI mode selection
        this.vsAI.selectedAIMode = "";
        this.vsAI.restless.alpha = 0.5;
        this.vsAI.normal.alpha = 0.5;
        this.vsAI.smart.alpha = 0.5;
      } else
        this.goBackButton.isVisible = false;
    };

    return {
      ...AIMode,
      start: startButton,
      visibility
    };
  }

  private initWatchAI() {
    const watchAITitle = new TextBlock("watchAITitle", "Watch AI"); {
      watchAITitle.width = 400 + "px";
      watchAITitle.height = 130 + "px";
      watchAITitle.top = "-250px";
      watchAITitle.fontSize = 72 + "px";
      watchAITitle.color = "white";
      this.ui.addControl(watchAITitle);
    }

    const leftAIMode = this.initAIMode(-220, "L");
    const rightAIMode = this.initAIMode(220, "R");

    const startButton = Button.CreateSimpleButton("startButton", "Start"); {
      startButton.width = 200 + "px";
      startButton.height = 60 + "px";
      startButton.top = "200px";
      startButton.fontSize = 42 + "px";
      startButton.color = "green";
      startButton.thickness = 0;
      startButton.background = "transparent";
      startButton.alpha = 0.7;
      startButton.onPointerEnterObservable.add(() => {
        startButton.alpha = 1;
      });
      startButton.onPointerOutObservable.add(() => {
        startButton.alpha = 0.7;
      });
      startButton.onPointerClickObservable.add(() => {
        // Start match vs AI // Without Backend
        this.watchAI.left.selectedAIMode = "";
        this.watchAI.right.selectedAIMode = "";
        Object.values(this.watchAI.left).forEach((obj) => {
          if (obj.alpha === 1) {
            switch (obj) {
              case this.watchAI.left.restless:
                this.watchAI.left.selectedAIMode = "restless";
                break;
              case this.watchAI.left.normal:
                this.watchAI.left.selectedAIMode = "normal";
                break;
              case this.watchAI.left.smart:
                this.watchAI.left.selectedAIMode = "smart";
                break;
            }
          }
        });
        Object.values(this.watchAI.right).forEach((obj) => {
          if (obj.alpha === 1) {
            switch (obj) {
              case this.watchAI.right.restless:
                this.watchAI.right.selectedAIMode = "restless";
                break;
              case this.watchAI.right.normal:
                this.watchAI.right.selectedAIMode = "normal";
                break;
              case this.watchAI.right.smart:
                this.watchAI.right.selectedAIMode = "smart";
                break;
            }
          }
        });
        //console.log("Selected AI Modes:", this.watchAI.left.selectedAIMode, this.watchAI.right.selectedAIMode);
        if (this.watchAI.left.selectedAIMode === "" || this.watchAI.right.selectedAIMode === "") return;
        this.watchAI.visibility(false);
        this.startedType = { type: "watchAI", aiMode1: this.watchAI.left.selectedAIMode, aiMode2: this.watchAI.right.selectedAIMode };
        this.match.visibility(true, this.startedType.aiMode1 + "AI", this.startedType.aiMode2 + "AI");
      });
      this.ui.addControl(startButton);
    }

    const visibility = (visible: boolean) => {
      //console.log("watchAI visibility:", visible);
      Object.values(this.watchAI).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      Object.values(this.watchAI.left).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      Object.values(this.watchAI.right).forEach((obj) => {
        if (obj && typeof obj === "object" && "isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.font.isVisible = visible;
      if (visible) {
        // Reset AI mode selection
        this.watchAI.left.selectedAIMode = "";
        this.watchAI.left.restless.alpha = 0.5;
        this.watchAI.left.normal.alpha = 0.5;
        this.watchAI.left.smart.alpha = 0.5;
        this.watchAI.right.selectedAIMode = "";
        this.watchAI.right.restless.alpha = 0.5;
        this.watchAI.right.normal.alpha = 0.5;
        this.watchAI.right.smart.alpha = 0.5;
      } else
        this.goBackButton.isVisible = false;
    };

    return {
      title: watchAITitle,
      left: leftAIMode,
      right: rightAIMode,
      start: startButton,
      visibility
    };
  }

  private initLogin() {
    const loginBlock = new Rectangle("loginBlock"); {
      loginBlock.width = 400 + "px";
      loginBlock.height = 600 + "px";
      loginBlock.background = "rgba(0, 0, 0, 0.7)";
      loginBlock.thickness = 0.5;
      loginBlock.cornerRadius = 10;
      this.ui.addControl(loginBlock);
    }

    const closeLoginButton = Button.CreateSimpleButton("closeLoginButton", "X"); {
      closeLoginButton.parent = loginBlock;
      closeLoginButton.width = 40 + "px";
      closeLoginButton.height = 40 + "px";
      closeLoginButton.top = "-270px";
      closeLoginButton.left = "170px";
      closeLoginButton.fontSize = 24 + "px";
      closeLoginButton.color = "white";
      closeLoginButton.thickness = 0;
      closeLoginButton.background = "transparent";
      closeLoginButton.onPointerEnterObservable.add(() => {
        closeLoginButton.color = "red";
      });
      closeLoginButton.onPointerOutObservable.add(() => {
        closeLoginButton.color = "white";
      });
      closeLoginButton.onPointerClickObservable.add(() => {
        this.login.visibility(false);
      });
      loginBlock.addControl(closeLoginButton);
    }

    const loginTitle = new TextBlock("loginTitle", "LOGIN"); {
      loginTitle.parent = loginBlock;
      loginTitle.width = 400 + "px";
      loginTitle.height = 100 + "px";
      loginTitle.top = "-150px";
      loginTitle.fontSize = 72 + "px";
      loginTitle.color = "white";
      loginBlock.addControl(loginTitle);
    }

    const usernameInput = new InputText("usernameInput"); {
      usernameInput.parent = loginBlock;
      usernameInput.width = 300 + "px";
      usernameInput.height = 60 + "px";
      usernameInput.top = "-30px";
      usernameInput.fontSize = 32 + "px";
      usernameInput.color = "white";
      usernameInput.background = "transparent";
      usernameInput.thickness = 0.1;
      usernameInput.placeholderText = "Username";
      loginBlock.addControl(usernameInput);
    }

    const passwordInput = new InputPassword("passwordInput"); {
      passwordInput.parent = loginBlock;
      passwordInput.width = 300 + "px";
      passwordInput.height = 60 + "px";
      passwordInput.top = "70px";
      passwordInput.fontSize = 32 + "px";
      passwordInput.color = "white";
      passwordInput.background = "transparent";
      passwordInput.thickness = 0.1;
      passwordInput.placeholderText = "Password";
      loginBlock.addControl(passwordInput);
    }

    const loginButton = Button.CreateSimpleButton("loginButton", "Login"); {
      loginButton.parent = loginBlock;
      loginButton.width = 200 + "px";
      loginButton.height = 60 + "px";
      loginButton.top = "170px";
      loginButton.fontSize = 32 + "px";
      loginButton.color = "white";
      loginButton.thickness = 0;
      loginButton.background = "transparent";
      loginButton.alpha = 0.5;
      loginButton.onPointerEnterObservable.add(() => {
        loginButton.alpha = 1;
      });
      loginButton.onPointerOutObservable.add(() => {
        loginButton.alpha = 0.5;
      });
      loginButton.onPointerClickObservable.add(() => {
        // Perform login action here
        const username = usernameInput.text;
        const password = passwordInput.text;
        
        if (username === "" || password === "") {
          popUpAlert("Error", "Please enter both username and password.")
          // alert("Please enter both username and password.");
          return;
        }

        if (!this.currentTournament) {
          createMatch("registered", username, password).then((match) => {
            if (match == null){
              popUpAlert("Error", "Fail to login. Please try again");
              return;
            }
            this.currentMatch = match;
            this.login.visibility(false);
            this.vsFriend.visibility(false);
            this.startedType = { type: "local" };
            this.match.visibility(true, this.currentMatch.player1.name, this.currentMatch.player2.name);
          });
        } else {
          joinTournamentAsLogged(this.currentTournament.id, username, password)
          .then((player) => {
            if (player == null) return;
            this.tournament.addPlayer(player);
            this.login.visibility(false);
          })
          .catch((err) => {
            popUpAlert("Error", err.message)
	        });
        }
      });
      this.ui.addControl(loginButton);
    }

    const visibility = (visible: boolean, prevUI?: any) => {
      Object.values(this.login).forEach((obj) => {
        if ("isVisible" in obj) {
          obj.isVisible = visible;
        }
      });
      this.font2.isVisible = visible;
      if (visible) {
        usernameInput.text = "";
        passwordInput.text = "";
      }
      else if (prevUI) {
        if ("visibility" in prevUI) {
          prevUI.visibility(false);
        }
      }
    };

    return {
      block: loginBlock,
      close: closeLoginButton,
      title: loginTitle,
      username: usernameInput,
      password: passwordInput,
      login: loginButton,
      visibility
    };
  }

  private initScore() {
    const hyphen = new TextBlock("constHyphen", "-"); {
      hyphen.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
      hyphen.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      hyphen.top = "-350px";
      hyphen.color = "white";
      hyphen.fontSize = 72 + "px";
      hyphen.isVisible = false;
      this.ui.addControl(hyphen);
    }

    const leftScore = new TextBlock("leftScore", "0".padEnd(2)); {
      leftScore.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_RIGHT;
      leftScore.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      leftScore.top = "-350px";
      leftScore.left = "-1040px";
      leftScore.color = "white";
      leftScore.fontSize = 72 + "px";
      leftScore.isVisible = false;
      this.ui.addControl(leftScore);
    }

    const rightScore = new TextBlock("rightScore", "0"); {
      rightScore.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
      rightScore.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      rightScore.top = "-350px";
      rightScore.left = "1040px";
      rightScore.color = "white";
      rightScore.fontSize = 72 + "px";
      rightScore.isVisible = false;
      this.ui.addControl(rightScore);
    }

    const update = (scoreSide: "left" | "right", score: number) => {
      let scoreText = score.toString();
      if (scoreSide == "left")
        scoreText = scoreText.padEnd(2);
      this.score[scoreSide].text = scoreText;
    };

    const visibility = (visible: boolean) => {
      this.score.left.isVisible = visible;
      this.score.right.isVisible = visible;
      this.score.constHyphen.isVisible = visible;
    };

    return {
      left: leftScore,
      right: rightScore,
      constHyphen: hyphen,
      update,
      visibility
    };
  }

  private initPanel() {
    // Side Panel
    const panelBlock = new Rectangle("panelBlock"); {
      panelBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      panelBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      panelBlock.width = "275px";
      panelBlock.height = "40%";
      panelBlock.background = "transparent";
      panelBlock.thickness = 0;
      panelBlock.isVisible = false;
    }

    const panelFontBlock = new Rectangle("panelFontBlock"); {
      panelFontBlock.parent = panelBlock;
      panelFontBlock.width = "100%";
      panelFontBlock.height = "100%";
      panelFontBlock.background = "black";
      panelFontBlock.alpha = 0.5;
      panelFontBlock.cornerRadiusZ = 20;
      panelFontBlock.thickness = 0;
      panelBlock.addControl(panelFontBlock);
    }
    
    const playersBlock = new Rectangle("playersBlock"); {
      playersBlock.parent = panelBlock;
      playersBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      playersBlock.width = "75%";
      playersBlock.height = "40%";
      playersBlock.top = "10px";
      playersBlock.thickness = 0;
    }

    const player1 = new TextBlock("player1", "Player1"); {
      player1.parent = playersBlock;
      player1.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;
      player1.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
      player1.left = "10px";
      player1.top = "10px";
      player1.color = "purple";
      player1.fontSize = 42 + "px";
      player1.fontWeight = "bold";
      playersBlock.addControl(player1);
    }

    const constVS = new TextBlock("constVS", "VS"); {
      constVS.parent = playersBlock;
      constVS.color = "green";
      constVS.fontSize = 32 + "px";
      playersBlock.addControl(constVS);
    }

    const player2 = new TextBlock("player2", "Player2"); {
      player2.parent = playersBlock;
      player2.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_BOTTOM;
      player2.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_RIGHT;
      player2.left = "-10px";
      player2.top = "-10px";
      player2.color = "purple";
      player2.fontSize = 42 + "px";
      player2.fontWeight = "bold";
      playersBlock.addControl(player2);
    }
    panelBlock.addControl(playersBlock);
    
    const winPartsBlock = new Rectangle("winPartsBlock"); {
      winPartsBlock.parent = panelBlock;
      winPartsBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      winPartsBlock.width = "75%";
      winPartsBlock.height = "30%";
      winPartsBlock.top = "180px";
      winPartsBlock.thickness = 0;
    }
    
    const title = new TextBlock("title", "Win Parts"); {
      title.parent = winPartsBlock;
      title.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;
      title.color = "green";
      title.fontSize = 32 + "px";
      title.fontWeight = "bold";
      winPartsBlock.addControl(title);
    }

    const p1 = new TextBlock("p1", "0"); {
      p1.parent = winPartsBlock;
      p1.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
      p1.left = "20px";
      p1.top = "10px";
      p1.color = "purple";
      p1.fontSize = 28 + "px";
      winPartsBlock.addControl(p1);
    }

    const constHyphen = new TextBlock("constHyphen", "-"); {
      constHyphen.parent = winPartsBlock;
      constHyphen.top = "10px";
      constHyphen.color = "green";
      constHyphen.fontSize = 28 + "px";
      winPartsBlock.addControl(constHyphen);
    }

    const p2 = new TextBlock("p2", "0"); {
      p2.parent = winPartsBlock;
      p2.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_RIGHT;
      p2.top = "10px";
      p2.left = "-20px";
      p2.color = "purple";
      p2.fontSize = 28 + "px";
      winPartsBlock.addControl(p2);
    }
    panelBlock.addControl(winPartsBlock);
    
    const speedBlock = new Rectangle("speedBlock"); {
      speedBlock.parent = panelBlock;
      speedBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      speedBlock.width = "75%";
      speedBlock.height = "30%";
      speedBlock.top = "290px";
      speedBlock.thickness = 0;
    }
    
    const speedTitle = new TextBlock("speedTitle", "Speed"); {
      speedTitle.parent = speedBlock;
      speedTitle.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;
      speedTitle.color = "green";
      speedTitle.fontSize = 32 + "px";
      speedTitle.fontWeight = "bold";
      speedBlock.addControl(speedTitle);
    }

    const speedValue = new TextBlock("speedValue", "0.2"); {
      speedValue.parent = speedBlock;
      speedValue.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
      speedValue.left = "40px";
      speedValue.top = "10px";
      speedValue.color = "purple";
      speedValue.fontSize = 28 + "px";
      speedBlock.addControl(speedValue);
    }

    const speedUnit = new TextBlock("speedUnit", "/frame"); {
      speedUnit.parent = speedBlock;
      speedUnit.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_RIGHT;
      speedUnit.top = "10px";
      speedUnit.left = "-10px";
      speedUnit.color = "green";
      speedUnit.fontSize = 28 + "px";
      speedBlock.addControl(speedUnit);
    }
    panelBlock.addControl(speedBlock);

    const updateSpeed = (value: number) => {
      this.panel.speed.value.text = value.toString().slice(0, 5);
      this.panel.speed.value.top = "10px";
    };
    
    this.ui.addControl(panelBlock);

    const visibility = (visible: boolean) => {
      this.panel.block.isVisible = visible;

      if (visible) {
        this.panel.players.player1.text = this.match.player1.text;
        this.panel.players.player2.text = this.match.player2.text;
      }
    };

    return {
      block: panelBlock,
      players: {
        block: playersBlock,
        player1: player1,
        player2: player2,
        constVS: constVS
      },
      winParts: {
        block: winPartsBlock,
        title: title,
        player1: p1,
        player2: p2,
        constHyphen: constHyphen
      },
      speed: {
        block: speedBlock,
        title: speedTitle,
        value: speedValue,
        unit: speedUnit,
        update: updateSpeed
      },
      visibility
    }
  }
}