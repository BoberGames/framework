// import { ApplicationBase } from "../../common/ApplicationBase";
// import {
//     CLEAR_CURRENT_WINS,
//     DISABLE_BUTTON_PANEL,
//     DROP_LAST_BOARD,
//     ON_ACTIVATE_FAST_STOP_BTN,
//     ON_BIG_WIN_COMPLETE,
//     ON_BIG_WIN_START,
//     ON_CHECKED_FOR_FS,
//     ON_CLUSTER_WIN,
//     ON_FS_EXIT,
//     ON_FS_TRANSITION_EXIT_FINISH,
//     ON_FS_TRANSITION_FINISH,
//     ON_FS_WON,
//     ON_REMOVE_TOTAL_WIN,
//     ON_RESET_TIMESCALE,
//     ON_SPIN,
//     ON_SPIN_COMPLETE,
//     ON_SPIN_READY,
//     ON_UPDATE_WIN,
//     POP_UP_CLOSED,
//     STOP_AUTO_PLAY
// } from "../Events";
// import { CascadeModel } from "./CascadeModel";
// import { BoardView } from "./BoardView";
// import { Model } from "../../common/model";
// import { SingleFreeSpinResult, TumbleCfg } from "./TumbleCfg";
// import {BIG_WIN_MULTIPLIER} from "../../common/gameConstant";
// import {Spacebar} from "../../index";
// import { hideReplayIcon, showReplayIcon } from "../ReplayIcon";
//
// export class CascadeController {
//     private model: CascadeModel;
//     private view: BoardView;
//     private clearedBoardPromise: Promise<void>;
//     public isFreeSpinsActive: boolean = false;
//     private stopTheGame: boolean = false;
//     private isBoardAlreadyCleared: boolean = false;
//
//     constructor(view: BoardView, model: CascadeModel) {
//         this.model = model;
//         this.view = view;
//
//         // Subscribe to spin events.
//         ApplicationBase.instance.on(ON_SPIN, this.clearBoard.bind(this));
//         ApplicationBase.instance.on(ON_SPIN_READY, (data) => this.handleSpinReady(data));
//         ApplicationBase.instance.on(DROP_LAST_BOARD, async () => { await this.dropNewBoard(this.model.lastGrid);  ApplicationBase.instance.emit(ON_SPIN_COMPLETE);});
//
//         // Show the initial screen.
//         this.view.showInitialScreen(this.model.getInitialScreen());
//
//         if (this.model.isTheSessionRestored) {
//             showReplayIcon();
//             ApplicationBase.instance.emit(DISABLE_BUTTON_PANEL);
//             this.clearBoard(true);
//             this.handleSpinReady(this.model.getRestoreSpinData());
//         }
//     }
//
//     /**
//      * Processes spin-ready data: waits for board clear and data parsing, then drops the board,
//      * processes tumbles, and checks for free spins.
//      */
//     public async handleSpinReady(data: any): Promise<void> {
//         if(this.stopTheGame) return
//         const parseDataPromise = this.model.parseSpinData(data);
//         await Promise.all([this.clearedBoardPromise, parseDataPromise]);
//         Spacebar.setCurrentAction(Spacebar.actions.FAST_STOP)
//         Spacebar.setEnabled(true);
//         await this.dropNewBoard();
//         await this.checkForTumbles();
//         await this.checkForFreeSpins();
//     }
//
//     /**
//      * Clears the board visually and sets the promise.
//      */
//     public clearBoard(isRestore: boolean = false): void {
//         if (this.isBoardAlreadyCleared) {
//             console.error("Error: Grid is empty or invalid.");
//             return
//         }
//         this.isBoardAlreadyCleared = true;
//         this.clearedBoardPromise = this.view.clearBoard(this.isFreeSpinsActive);
//         if (!isRestore) hideReplayIcon();
//     }
//
//     /**
//      * Drops new symbols onto the board.
//      */
//     public async dropNewBoard(newBoard?: string[][]): Promise<void> {
//         const board = newBoard ?? this.model.getNewBoard();
//         await this.view.dropNewBoard(board);
//         ApplicationBase.instance.emit(ON_RESET_TIMESCALE);
//         this.isBoardAlreadyCleared = false;
//     }
//
//     private async handleWins(cluster: any): Promise<void> {
//         let { clusterSize, symbol, SymbolMultiplier, multiplierSum = 1 } = cluster;
//         // Ensure multiplierSum is not zero
//         multiplierSum = multiplierSum === 0 ? 1 : multiplierSum;
//         const win = Model.instance.getCurrentBet() * SymbolMultiplier;
//         const winWithoutMultiplier = win / multiplierSum;
//         await this.view.queueShowWinText(winWithoutMultiplier, cluster.coordinates, multiplierSum);
//         ApplicationBase.instance.emit(ON_CLUSTER_WIN, { clusterSize, symbol, win });
//         if(this.model.totalFreeSpins > 0) {
//             //This way we update without reset only during free spins
//             this.model.currentTotalFSWins += win;
//             ApplicationBase.instance.emit(ON_UPDATE_WIN, this.model.currentTotalFSWins);
//         }
//     }
//
//
//     /**
//      * Processes an array of cluster data.
//      */
//     private async handleCluster(cluster: any): Promise<void> {
//         if (!cluster) return;
//         ApplicationBase.instance.emit(ON_RESET_TIMESCALE);
//         await this.view.explodeCluster(cluster.coordinates);
//     }
//
//
//     /**
//      * Recursively processes tumbles until none remain.
//      */
//     private async checkForTumbles(): Promise<void> {
//         while (true) {
//             const tumbleResult = this.model.getTumbles();
//
//             if (!tumbleResult) {
//                 if (!this.isFreeSpinsActive && this.model.totalWin > 0 && this.model.totalFreeSpins <= 0) {
//                     ApplicationBase.instance.emit(ON_RESET_TIMESCALE);
//                     Spacebar.setCurrentAction(Spacebar.actions.NOTHING);
//                     this.view.showTotalWin(this.model.totalWin);
//                     this.model.gameModel.setWin(this.model.totalWin);
//                     ApplicationBase.instance.emit(ON_UPDATE_WIN);
//                     if (this.model.totalWin / this.model.gameModel.getCurrentBet() >= BIG_WIN_MULTIPLIER) {
//                         await new Promise<void>((resolve) => {
//                             ApplicationBase.instance.once(ON_BIG_WIN_COMPLETE, resolve);
//                         });
//                     }
//                 }
//
//                 if (!this.isFreeSpinsActive && this.model.totalFreeSpins <= 0 || Model.instance.getAutoPlayMode()) {
//                     ApplicationBase.instance.emit(ON_SPIN_COMPLETE);
//                 }
//                 break;
//             }
//
//             await Promise.all(tumbleResult.cluster.map((cluster: any) => this.handleCluster(cluster)));
//             await this.getNewMultiplierGrid(tumbleResult.multiplierGrid);
//             await Promise.all(tumbleResult.cluster.map((cluster: any) => this.handleWins(cluster)));
//             await this.view.dropHangingSymbols();
//             await this.view.updateBoardWithNewData(tumbleResult.screen);
//         }
//     }
//
//     /**
//      * Iterates over the multiplier grid and notifies the view.
//      */
//     private async getNewMultiplierGrid(gridData: number[][]): Promise<void> {
//         for (let col = 0; col < gridData.length; col++) {
//             for (let row = 0; row < gridData[col].length; row++) {
//                 const multiplierValue = gridData[col][row];
//                 this.view.handleMultipliers(row, col, multiplierValue);
//             }
//         }
//     }
//
//     /**
//      * Checks and processes free spins conditions.
//      */
//     private async checkForFreeSpins(): Promise<void> {
//         const freeSpinsData: SingleFreeSpinResult[] = Array.isArray(this.model.allFreeSpins)
//             ? this.model.allFreeSpins
//             : [];
//
//         if (!freeSpinsData || freeSpinsData.length === 0) {
//             ApplicationBase.instance.emit(ON_CHECKED_FOR_FS);
//             return;
//         }
//
//         if (!this.isFreeSpinsActive && this.model.freeSpinsLeft > 0) {
//             this.model.gameModel.setIsInFreeSpins(true);
//             ApplicationBase.instance.emit(ON_CHECKED_FOR_FS);
//             if(Model.instance.getAutoPlayMode()) {
//                 ApplicationBase.instance.emit(STOP_AUTO_PLAY);
//             }
//             Spacebar.setEnabled(false);
//             await this.view.showSymbolsAnimById(TumbleCfg.scatterId);
//             if(this.model.gameModel.isPopupOpen) {
//                 await this.waitForPopUp();
//             }
//             this.activateFreeSpins();
//             this.view.clearAllMultipliers();
//             await this.handleFSTransition();
//             this.view.updateFreeSpins(this.model.freeSpinsLeft);
//             await this.view.showFreeSpinsCounter();
//         }
//
//         let isFirstSpin = true;
//
//         for (const freeSpinResult of freeSpinsData) {
//             ApplicationBase.instance.emit(ON_RESET_TIMESCALE);
//             if (!this.isFreeSpinsActive) break;
//             if (this.model.freeSpinsLeft > 0) {
//                 this.view.updateFreeSpins(--this.model.freeSpinsLeft);
//             }
//             await this.view.clearBoard(this.isFreeSpinsActive);
//             Spacebar.setCurrentAction(Spacebar.actions.FAST_STOP);
//             Spacebar.setEnabled(true);
//             ApplicationBase.instance.emit(ON_ACTIVATE_FAST_STOP_BTN);
//             await this.view.dropNewBoard(freeSpinResult.screen);
//
//             const tumblesList = Array.isArray(freeSpinResult.tumbles)
//                 ? freeSpinResult.tumbles
//                 : [];
//
//             if (freeSpinResult.cluster?.length > 0) {
//                 if(isFirstSpin) {
//                     await this.getNewMultiplierGrid(freeSpinResult.multiplierGrid);
//                     await Promise.all(freeSpinResult.cluster.map((cluster: any) => this.handleCluster(cluster)));
//                 } else {
//                     await Promise.all(freeSpinResult.cluster.map((cluster: any) => this.handleCluster(cluster)));
//                     await this.getNewMultiplierGrid(freeSpinResult.multiplierGrid);
//                 }
//                 for (const item of freeSpinResult.cluster) {
//                     await this.handleWins(item)
//                 }
//                 await this.view.dropHangingSymbols();
//                 if (tumblesList?.length > 0) {
//                     await this.view.updateBoardWithNewData(tumblesList[0].screen);
//                 }
//             }
//
//             if (tumblesList.length > 0) {
//                 for (let j = 0; j < tumblesList.length; j++) {
//                     const tumble = tumblesList[j];
//                     if (tumble.cluster?.length > 0) {
//                         await Promise.all(tumble.cluster.map((cluster: any) => this.handleCluster(cluster)));
//                         await this.getNewMultiplierGrid(tumble.multiplierGrid);
//
//                         for (const item of tumble.cluster) {
//                             await this.handleWins(item)
//                         }
//
//                         await this.view.dropHangingSymbols();
//                     }
//                     if (j < tumblesList.length - 1) {
//                         await this.view.updateBoardWithNewData(tumblesList[j + 1].screen);
//                     }
//                 }
//             }
//
//             if (freeSpinResult.reTrigger && freeSpinResult.reTriggerSpins) {
//                 Spacebar.setEnabled(false);
//                 await this.handleRetrigger(freeSpinResult.reTriggerSpins);
//                 Spacebar.setEnabled(true);
//             }
//
//             isFirstSpin = false;
//             await this.checkIfBigWin(freeSpinResult.spinTotalWin);
//
//             if (this.model.freeSpinsLeft <= 0) {
//                 this.deactivateFreeSpins();
//                 ApplicationBase.instance.emit(ON_FS_EXIT, {
//                     winAmount: this.model.totalWin,
//                     fsCount: this.model.totalFreeSpins,
//                 });
//                 await new Promise<void>((resolve) => {
//                     ApplicationBase.instance.once(ON_FS_TRANSITION_EXIT_FINISH, resolve);
//                 });
//                 ApplicationBase.instance.emit(ON_SPIN_COMPLETE);
//             }
//
//         }
//     }
//
//     private async checkIfBigWin(win: number): Promise<void> {
//         ApplicationBase.instance.emit(ON_RESET_TIMESCALE);
//         if (win / this.model.gameModel.getCurrentBet() >= BIG_WIN_MULTIPLIER) {
//             ApplicationBase.instance.emit(ON_BIG_WIN_START, win);
//             await new Promise<void>((resolve) => {
//                 ApplicationBase.instance.once(ON_BIG_WIN_COMPLETE, resolve);
//             });
//         } else {
//             // Immediately resolve if not a big win
//             return;
//         }
//     }
//
//
//     /**
//      * Activates free spins mode.
//      */
//     private activateFreeSpins(): void {
//         Spacebar.setEnabled(false);
//         Model.instance.allowSymPayTable = false;
//         Model.instance.setIsInFreeSpins(true);
//         this.isFreeSpinsActive = true;
//         ApplicationBase.instance.emit(CLEAR_CURRENT_WINS);
//         ApplicationBase.instance.emit(ON_REMOVE_TOTAL_WIN);
//         ApplicationBase.instance.emit(ON_FS_WON, {
//             numberOfFs: this.model.freeSpinsLeft,
//             reTrigger: false,
//         });
//     }
//
//     /**
//      * Deactivates free spins mode.
//      */
//     private deactivateFreeSpins(): void {
//         Spacebar.setEnabled(false);
//         Model.instance.setIsInFreeSpins(false);
//         this.isFreeSpinsActive = false;
//         this.model.gameModel.isInFreeSpins = false;
//         this.view.hideFreeSpins();
//     }
//
//     /**
//      * Handles re-triggering of additional free spins.
//      */
//     private async handleRetrigger(extraSpins: number): Promise<void> {
//         this.model.freeSpinsLeft += extraSpins;
//         ApplicationBase.instance.emit(ON_FS_WON, { numberOfFs: extraSpins, reTrigger: true });
//         this.view.updateFreeSpins(this.model.freeSpinsLeft);
//         await this.handleFSTransition();
//     }
//
//     /**
//      * Initiates the free spins transition sequence.
//      */
//     private async handleFSTransition(): Promise<void> {
//         try {
//             await this.resolveFSTransition();
//             console.log("Free spins transition completed.");
//         } catch (error) {
//             console.error("Unexpected error during free spins transition:", error);
//         }
//     }
//
//     /**
//      * Returns a promise that resolves when the free spins transition finishes.
//      */
//     private async resolveFSTransition(): Promise<void> {
//         return new Promise<void>((resolve) => {
//             ApplicationBase.instance.once(ON_FS_TRANSITION_FINISH, resolve);
//         });
//     }
//
//     private async waitForPopUp(): Promise<void> {
//         return new Promise<void>((resolve) => {
//             ApplicationBase.instance.once(POP_UP_CLOSED, resolve);
//         });
//     }
// }
