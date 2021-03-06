import React from "react";
import Panel from "muicss/lib/react/panel";
import { EventEmitter } from "fbemitter";
import axios from "axios";
import { Server } from "osch-sdk";
import NetworkStatus from "./components/NetworkStatus";
import OldNetstatus from "./components/OldNetstatus";
import ShowAccount from "./components/ShowAccount";
import Nodes from "./components/Nodes";
import LedgerCloseChart from "./components/LedgerCloseChart";
import RecentOperations from "./components/RecentOperations";
import TransactionsChart from "./components/TransactionsChart";
import { LIVE_NEW_LEDGER, TEST_NEW_LEDGER } from "../../events";

const coastLive = "http://coast.myoschain.com";
const coastTest = "http://tcoast.myoschain.com";

export default class Main extends React.Component {
  constructor(props) {
    super(props);
    this.emitter = new EventEmitter();
    this.sleepDetector();
    this.state = {};
  }
  componentDidMount() {
    this.streamLedgers(coastLive, LIVE_NEW_LEDGER);
    this.streamLedgers(coastTest, TEST_NEW_LEDGER);
  }
  reloadOnConnection() {
    return axios
      .get(coastLive, {
        timeout: 5 * 1000
      })
      .then(() => location.reload())
      .catch(() => setTimeout(this.reloadOnConnection.bind(this), 1000));
  }
  sleepDetector() {
    if (!this.lastTime) {
      this.lastTime = new Date();
    }
    let currentTime = new Date();
    if (currentTime - this.lastTime > 10 * 60 * 1000) {
      this.setState({ sleeping: true });
      this.reloadOnConnection();
      return;
    }
    this.lastTime = new Date();
    setTimeout(this.sleepDetector.bind(this), 5000);
  }
  streamLedgers(horizonURL, eventName) {
    // Get last ledger
    const _this = this;
    let lastLedger;
    axios.get(`${horizonURL}/ledgers?order=desc&limit=1`).then(response => {
      let lastLedger = response.data._embedded.records[0];
      setInterval(() => {
        axios.get(`${horizonURL}/ledgers?order=desc&limit=1`).then(response => {
          let newLedger = response.data._embedded.records[0];
          if (lastLedger.sequence !== newLedger.sequence) {
            lastLedger = newLedger;
            _this.emitter.emit(eventName, newLedger);
          }
        });
      }, 3000);
    });
    // new Server(horizonURL)
    //   .ledgers()
    //   .cursor(lastLedger.paging_token)
    //   .then((ledger)=>{
    //     console.log(ledger);
    //   })
    // .stream({
    //   onmessage: function ledger(ledger1) {
    //     console.log(ledger1);
    //     _this.emitter.emit(eventName, ledger1);
    //   }
    // });
  }

  render() {
    return (
      <div id="main">
        {this.state.sleeping ? (
          <Panel>
            <div className="mui--text-subhead mui--text-accent">
              System sleep detected. Waiting for internet connection...
            </div>
          </Panel>
        ) : null}
        <div id="main" className="mui-container-fluid">
          <section>
            <h1>Open Source Chain Dashboard</h1>
            <div className="row clear">
              <div className="mui-col-md-8">
                <NetworkStatus
                  network="Live network"
                  horizonURL={coastLive}
                  newLedgerEventName={LIVE_NEW_LEDGER}
                  emitter={this.emitter}
                />
                <LedgerCloseChart
                  network="Live network"
                  horizonURL={coastLive}
                  limit="200"
                  newLedgerEventName={LIVE_NEW_LEDGER}
                  emitter={this.emitter}
                />
                <TransactionsChart
                  network="Live network"
                  horizonURL={coastLive}
                  limit="200"
                  newLedgerEventName={LIVE_NEW_LEDGER}
                  emitter={this.emitter}
                />
              </div>
              <div className="mui-col-md-4">
                <RecentOperations
                  limit="35"
                  label="Live network"
                  horizonURL={coastLive}
                  emitter={this.emitter}
                />
              </div>
            </div>
          </section>
          <section>
            <h1>Featured live network nodes</h1>
            <Nodes />
          </section>
          <section>
            <h1>Test network status</h1>
            <div className="mui-col-md-8">
              <OldNetstatus
                network="Test network"
                horizonURL={coastTest}
                newLedgerEventName={TEST_NEW_LEDGER}
                emitter={this.emitter}
              />
              <LedgerCloseChart
                network="Test network"
                horizonURL={coastTest}
                limit="100"
                newLedgerEventName={TEST_NEW_LEDGER}
                emitter={this.emitter}
              />
              <TransactionsChart
                network="Test network"
                horizonURL={coastTest}
                limit="100"
                newLedgerEventName={TEST_NEW_LEDGER}
                emitter={this.emitter}
              />
            </div>
            <div className="mui-col-md-4">
              <RecentOperations
                limit="25"
                label="Test network"
                horizonURL={coastTest}
                emitter={this.emitter}
              />
            </div>
          </section>
        </div>
      </div>
    );
  }
}
