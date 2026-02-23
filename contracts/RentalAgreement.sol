// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RentalAgreement
 * @dev Manages property rental agreements on-chain
 */
contract RentalAgreement {
    // ─── State ───────────────────────────────────────────────────────────────
    address public admin;
    uint256 public agreementCount;

    enum AgreementStatus { Pending, Active, Terminated, Expired }

    struct Agreement {
        uint256 id;
        address owner;
        address tenant;
        string  propertyId;      // off-chain DB id
        uint256 monthlyRent;     // in wei
        uint256 startDate;       // unix timestamp
        uint256 endDate;         // unix timestamp
        string  ipfsCID;         // agreement document on IPFS
        AgreementStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Agreement) public agreements;
    // owner/tenant address => list of their agreement IDs
    mapping(address => uint256[]) public userAgreements;

    // ─── Events ──────────────────────────────────────────────────────────────
    event AgreementCreated(
        uint256 indexed id,
        address indexed owner,
        address indexed tenant,
        string  propertyId,
        uint256 monthlyRent,
        string  ipfsCID
    );
    event AgreementTerminated(uint256 indexed id, address terminatedBy);
    event AgreementExpired(uint256 indexed id);

    // ─── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier agreementExists(uint256 _id) {
        require(_id > 0 && _id <= agreementCount, "Agreement does not exist");
        _;
    }

    modifier onlyParty(uint256 _id) {
        Agreement storage a = agreements[_id];
        require(
            msg.sender == a.owner || msg.sender == a.tenant,
            "Not a party to this agreement"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ─── Core Functions ──────────────────────────────────────────────────────

    /**
     * @notice Create a new rental agreement
     * @param _tenant      Address of the tenant
     * @param _propertyId  Off-chain property identifier
     * @param _monthlyRent Agreed monthly rent in wei
     * @param _startDate   Lease start (unix timestamp)
     * @param _endDate     Lease end   (unix timestamp)
     * @param _ipfsCID     IPFS CID of the signed agreement PDF
     */
    function createAgreement(
        address _tenant,
        string  calldata _propertyId,
        uint256 _monthlyRent,
        uint256 _startDate,
        uint256 _endDate,
        string  calldata _ipfsCID
    ) external returns (uint256) {
        require(_tenant != address(0),       "Invalid tenant address");
        require(_tenant != msg.sender,       "Owner cannot be tenant");
        require(_monthlyRent > 0,            "Rent must be > 0");
        require(_endDate > _startDate,       "Invalid date range");
        require(bytes(_ipfsCID).length > 0,  "IPFS CID required");

        agreementCount++;

        agreements[agreementCount] = Agreement({
            id:          agreementCount,
            owner:       msg.sender,
            tenant:      _tenant,
            propertyId:  _propertyId,
            monthlyRent: _monthlyRent,
            startDate:   _startDate,
            endDate:     _endDate,
            ipfsCID:     _ipfsCID,
            status:      AgreementStatus.Active,
            createdAt:   block.timestamp
        });

        userAgreements[msg.sender].push(agreementCount);
        userAgreements[_tenant].push(agreementCount);

        emit AgreementCreated(
            agreementCount,
            msg.sender,
            _tenant,
            _propertyId,
            _monthlyRent,
            _ipfsCID
        );

        return agreementCount;
    }

    /**
     * @notice Terminate an active agreement (either party can call)
     */
    function terminateAgreement(uint256 _id)
        external
        agreementExists(_id)
        onlyParty(_id)
    {
        Agreement storage a = agreements[_id];
        require(a.status == AgreementStatus.Active, "Agreement not active");

        a.status = AgreementStatus.Terminated;
        emit AgreementTerminated(_id, msg.sender);
    }

    /**
     * @notice Mark agreement as expired (callable by anyone after endDate)
     */
    function markExpired(uint256 _id) external agreementExists(_id) {
        Agreement storage a = agreements[_id];
        require(a.status == AgreementStatus.Active, "Agreement not active");
        require(block.timestamp > a.endDate, "Agreement has not expired yet");

        a.status = AgreementStatus.Expired;
        emit AgreementExpired(_id);
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    function getAgreement(uint256 _id)
        external
        view
        agreementExists(_id)
        returns (Agreement memory)
    {
        return agreements[_id];
    }

    function getUserAgreements(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userAgreements[_user];
    }

    function verifyAgreement(uint256 _id, string calldata _ipfsCID)
        external
        view
        agreementExists(_id)
        returns (bool)
    {
        return keccak256(bytes(agreements[_id].ipfsCID)) == keccak256(bytes(_ipfsCID));
    }
}
