import React from "react";
import Panel from "muicss/lib/react/panel";
import axios from "axios";
import round from "lodash/round";
import { ago } from "../../../common/time";
import config from "../../../config";

// ledgersInAverageCalculation defines how many last ledgers should be considered when calculating average ledger length.
const ledgersInAverageCalculation = 200;
export default class NetworkStatus extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true
    };
  }
  // This method will be called when a new ledger is created.
  onNewLedger(ledger) {
    let lastLedgerSequence = ledger.sequence;
    let closedAt = new Date(ledger.closed_at);
    let lastLedgerLength = closedAt - this.state.closedAt;
    // Update last ${ledgersInAverageCalculation} ledgers length sum by subtracting
    // the oldest measurement we have and adding the newest.
    this.records.unshift(ledger);
    let ledgerLengthSum =
      this.state.ledgerLengthSum -
      (new Date(this.records[this.records.length - 2].closed_at) -
        new Date(this.records[this.records.length - 1].closed_at)) /
        1000 +
      (new Date(this.records[0].closed_at) -
        new Date(this.records[1].closed_at)) /
        1000;
    this.records.pop();
    this.setState({
      closedAt,
      lastLedgerSequence,
      lastLedgerLength,
      ledgerLengthSum
    });
  }
  getLastLedgers() {
    axios
      .get(
        `${
          this.props.horizonURL
        }/ledgers?order=desc&limit=${ledgersInAverageCalculation}`
      )
      .then(response => {
        let ledger = response.data._embedded.records[0];
        let lastLedgerSequence = ledger.sequence;
        let prevLedger = response.data._embedded.records[1];
        let closedAt = new Date(ledger.closed_at);
        let lastLedgerLength =
          new Date(ledger.closed_at) - new Date(prevLedger.closed_at);

        this.records = response.data._embedded.records;
        let ledgerLengthSum = 0;
        for (let i = 0; i < this.records.length - 1; i++) {
          ledgerLengthSum +=
            (new Date(this.records[i].closed_at) -
              new Date(this.records[i + 1].closed_at)) /
            1000;
        }

        this.setState({
          closedAt,
          lastLedgerLength,
          lastLedgerSequence,
          ledgerLengthSum,
          loading: false
        });
        // Start listening to events
        this.props.emitter.addListener(
          this.props.newLedgerEventName,
          this.onNewLedger.bind(this)
        );
      });
  }
  componentWillMount() {
    // Update closedAgo
    if (this.props.network === "Live network") {
      axios.get(config.oschServer + "/baseInfor").then(res => {
        const {
          createTime,
          ledgerInfo,
          optAllNumber,
          nodeNum,
          assetArr,
          appNum
        } = res.data;

        this.setState({
          optAllNumber,
          nodeNum: nodeNum + 4,
          assetLength: assetArr.length,
          ledgerInfo,
          createTime,
          appNum,
          centerData: true
        });
        this.getLastLedgers();
      });
    }
    this.timerID = setInterval(() => {
      let closedAgo = null;

      if (this.state.closedAt) {
        closedAgo = (new Date() - this.state.closedAt) / 1000;
      }

      this.setState({ closedAgo });
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  render() {
    let statusClass;
    let statusText;

    let averageLedgerLength =
      this.state.ledgerLengthSum / ledgersInAverageCalculation;
    if (this.state.loading) {
      statusText = <strong className="mui--text-body2">Loading...</strong>;
    } else if (this.state.closedAgo >= 90) {
      // If last ledger closed more than 90 seconds ago it means network is down.
      statusClass = "down";
      statusText = (
        <strong className="mui--text-body2" style={{ color: "#666" }}>
          Network (or monitoring node) down!
        </strong>
      );
    } else {
      // Now we check the average close time but we also need to check the latest ledger
      // close time because if there are no new ledgers it means that network is slow or down.
      if (averageLedgerLength <= 10 && this.state.closedAgo < 20) {
        statusText = (
          <strong className="mui--text-body2" style={{ color: "#2196f3" }}>
            Up and running!
          </strong>
        );
      } else if (averageLedgerLength <= 15 && this.state.closedAgo < 40) {
        statusClass = "slow";
        statusText = (
          <strong className="mui--text-body2" style={{ color: "orange" }}>
            Network slow!
          </strong>
        );
      } else {
        statusClass = "very-slow";
        statusText = (
          <strong className="mui--text-body2" style={{ color: "red" }}>
            Network very slow!
          </strong>
        );
      }
    }
    let listItems;
    const {
      ledgerLengthSum,
      lastLedgerSequence,
      nodeNum,
      optAllNumber,
      assetLength,
      appNum
    } = this.state;
    if (this.state.centerData) {
      listItems = (
        <ul>
          <li>
            <h4>{lastLedgerSequence}</h4>
            <p>Ledger Height</p>
          </li>
          <li>
            <h4>{nodeNum}</h4>
            <p>Nodes</p>
          </li>
          <li>
            <h4>{optAllNumber}</h4>
            <p>Total Transactions</p>
          </li>
          <li>
            <h4>{assetLength}</h4>
            <p>Total Assets</p>
          </li>
          <li>
            <h4>7</h4>
            <p>Total Applications</p>
          </li>
        </ul>
      );
    }
    return (
      <Panel className="networkBox">
        <ul className="cardBox clear">{listItems}</ul>
        <div className="mui--text-caption mui--text-center">
          {statusText}
          <br />
          {!this.state.loading ? (
            <div>
              Creation time： 2019-01-29 Last ledger: #{lastLedgerSequence}{" "}
              closed ~{ago(this.state.closedAt)} ago in{" "}
              {this.state.lastLedgerLength / 1000}s.
              <br />
              Average ledger close time in the last{" "}
              {ledgersInAverageCalculation} ledgers:{" "}
              {round(averageLedgerLength, 2)}s. <br />
              BaseFee: {this.state.ledgerInfo.baseFee} OSCH BaseReserve:{" "}
              {this.state.ledgerInfo.baseReserve} OSCH
            </div>
          ) : (
            ""
          )}
        </div>
      </Panel>
    );
  }
}
