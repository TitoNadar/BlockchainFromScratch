
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');

const port = process.argv[2];
const nodeAddress = uuid().split('-').join('');
const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// get entire blockchain
app.get('/blockchain', function (req, res) {
    res.send(bitcoin);
  });


// create a new transaction
app.post('/transaction', function(req, res) {
	const newTransaction = req.body;
	const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
	res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});


// register a node and broadcast it the network
app.post('/register-and-broadcast-node', function(req, res) {
	const newNodeUrl = req.body.newNodeUrl;
	if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) bitcoin.networkNodes.push(newNodeUrl);

	const regNodesPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/register-node',
			method: 'POST',
			body: { newNodeUrl: newNodeUrl },
			json: true
		};

		regNodesPromises.push(rp(requestOptions));
	});

	Promise.all(regNodesPromises)
	.then(data => {
		const bulkRegisterOptions = {
			uri: newNodeUrl + '/register-nodes-bulk',
			method: 'POST',
			body: { allNetworkNodes: [ ...bitcoin.networkNodes, bitcoin.currentNodeUrl ] },
			json: true
		};

		return rp(bulkRegisterOptions);
	})
	.then(data => {
		res.json({ note: 'New node registered with network successfully.' });
	});
});
