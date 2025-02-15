using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;

namespace KatAppVUE.Endpoints.RBLe
{
	[ApiController]
	public class SessionlessProxy : ControllerBase
	{
		[HttpPost]
		[Route( "api/rble/sessionless-proxy" )]
		public IActionResult Handle() 
			=> new JsonResult( JsonObject.Parse(
"""
{
  "Results": [
    {
      "CalcEngine": "Conduent_Nexgen_Home_SE",
      "CacheKey": "f9Sp8SZdz2q6CfZXkwXD1IGPZOsK1UUxXxe9I0+dPsI=",
      "StatusCode": 200,
      "Result": {
        "RBL": {
          "Profile": {
            "@id-auth": "011391001",
            "@CalcEngineName": "Conduent_Nexgen_Home_SE",
            "@CalcEngineVersion": "1.1461",
            "@job-token": "8c1ef6a7-221f-472f-8e41-9cd848660e56",
            "Data": {
              "TabDef": [
                {
                  "@name": "RBLHome",
                  "@type": "ResultXml",
                  "@version": "1.1461",
                  "@calcEngine": "Conduent_Nexgen_Home_SE.xlsm",
                  "@Helpers.Version": "1.5649",
                  "@GlobalTables.Version": "1.4623",
                  "@GlobalTables.Name": "MadHatter_GlobalTables.xls",
                  "@Process.Time": 1695,
                  "@Process.Timestamp": "2025-02-14T23:09:58.540374Z",
                  "currentCoverage": [
                    {
                      "id": "1",
                      "index": "MEDICAL",
                      "icon": "fa-heart-pulse",
                      "benefitName": "Medical",
                      "optionName": "Aetna HSA 2000 Ded",
                      "optionID": "25",
                      "coverageLevelName": "You + Child(ren)",
                      "coveredCount": "3"
                    },
                    {
                      "id": "2",
                      "index": "DENTAL",
                      "icon": "fa-tooth",
                      "benefitName": "Dental",
                      "optionName": "Aetna Dental Plan",
                      "optionID": "01",
                      "coverageLevelName": "You + Child(ren)",
                      "coveredCount": "2"
                    },
                    {
                      "id": "3",
                      "index": "VISION",
                      "icon": "fa-glasses",
                      "benefitName": "Vision",
                      "optionName": "Waive Coverage",
                      "optionID": "00",
                      "coveredCount": "0"
                    }
                  ],
                  "table-output-control": [
                    {
                      "id": "openEvents",
                      "export": "1"
                    }
                  ],
                  "coverages": [
                    {
                      "id": "15",
                      "benefitType": "MEDICAL",
                      "group": "1",
                      "benefitName": "Medical",
                      "index": "1",
                      "summaryOrder": "1",
                      "icon": "fa-heart-pulse",
                      "optionNameRaw": "Aetna HSA 2000 Ded",
                      "pdf": "0",
                      "optionName": "Aetna HSA 2000 Ded",
                      "optionNameLabel": "Aetna HSA 2000 Ded",
                      "coverageLevelName": "You + Child(ren)",
                      "coveredCount": "3",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$926.77",
                      "effectiveDate": "Jan 15, 2025",
                      "optionId": "25",
                      "eeCost": "$96.12",
                      "creditBadge": "0",
                      "eeCostPreTax": "$96.12",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00",
                      "pendingEventID": "",
                      "pendingGroupCode": ""
                    },
                    {
                      "id": "10",
                      "benefitType": "HSA",
                      "group": "3",
                      "benefitName": "Health Savings Account",
                      "index": "2",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "I do not want to contribute to an HSA",
                      "pdf": "0",
                      "optionName": "Employee Annual Contribution: $0<br/>Employer Annual Contribution: $0",
                      "optionNameLabel": "Employee Annual Contribution: $0<br/>Employer Annual Contribution: $0",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 15, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "8",
                      "benefitType": "EETOBACCO",
                      "group": "1",
                      "benefitName": "Employee Tobacco Status",
                      "index": "4",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "Non Tobacco User",
                      "pdf": "0",
                      "optionName": "Non Tobacco User",
                      "optionNameLabel": "Non Tobacco User",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "7",
                      "benefitType": "DENTAL",
                      "group": "1",
                      "benefitName": "Dental",
                      "index": "6",
                      "summaryOrder": "2",
                      "icon": "fa-tooth",
                      "optionNameRaw": "Aetna Dental Plan",
                      "pdf": "0",
                      "optionName": "Aetna Dental Plan",
                      "optionNameLabel": "Aetna Dental Plan",
                      "coverageLevelName": "You + Child(ren)",
                      "coveredCount": "2",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$33.94",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "1",
                      "eeCost": "$13.86",
                      "creditBadge": "0",
                      "eeCostPreTax": "$13.86",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "19",
                      "benefitType": "VISION",
                      "group": "1",
                      "benefitName": "Vision",
                      "index": "7",
                      "summaryOrder": "3",
                      "icon": "fa-glasses",
                      "optionNameRaw": "Waive Coverage",
                      "pdf": "0",
                      "optionName": "Waive Coverage",
                      "optionNameLabel": "Waive Coverage",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "9",
                      "benefitType": "HCFSA",
                      "group": "3",
                      "benefitName": "Health Care Spending Account",
                      "index": "8",
                      "summaryOrder": "0",
                      "icon": "fa-sack-dollar",
                      "optionNameRaw": "Waive Coverage",
                      "pdf": "0",
                      "optionName": "Annual Contribution: $0",
                      "optionNameLabel": "Annual Contribution: $0",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "6",
                      "benefitType": "DCFSA",
                      "group": "3",
                      "benefitName": "Dependent Care Spending Account",
                      "index": "9",
                      "summaryOrder": "0",
                      "icon": "fa-sack-dollar",
                      "optionNameRaw": "Waive Coverage",
                      "pdf": "0",
                      "optionName": "Annual Contribution: $0",
                      "optionNameLabel": "Annual Contribution: $0",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "3",
                      "benefitType": "BASICLIFE",
                      "group": "4",
                      "benefitName": "Basic Life Insurance",
                      "index": "10",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "1x Pay",
                      "pdf": "0",
                      "optionName": "1x Pay",
                      "optionNameLabel": "1x Pay",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$10,000",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.09",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "1",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "2",
                      "benefitType": "ADD",
                      "group": "4",
                      "benefitName": "Basic AD&D Insurance",
                      "index": "11",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "1x Pay",
                      "pdf": "0",
                      "optionName": "1x Pay",
                      "optionNameLabel": "1x Pay",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$10,000",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.03",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "1",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "18",
                      "benefitType": "SUPPLIFE",
                      "group": "4",
                      "benefitName": "Supplemental Employee Life Insurance",
                      "index": "13",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "Waive Coverage",
                      "pdf": "0",
                      "optionName": "Waive Coverage",
                      "optionNameLabel": "Waive Coverage",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "17",
                      "benefitType": "SUPPADD",
                      "group": "4",
                      "benefitName": "Supplemental AD&D Insurance",
                      "index": "14",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "4x Pay",
                      "pdf": "0",
                      "optionName": "4x Pay",
                      "optionNameLabel": "4x Pay",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "4",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "4",
                      "benefitType": "CHILDLIFE",
                      "group": "4",
                      "benefitName": "Child Life Insurance",
                      "index": "15",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "10000",
                      "pdf": "0",
                      "optionName": "$10,000",
                      "optionNameLabel": "$10,000",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$10,000",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$1.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "2",
                      "eeCost": "$0.46",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.46",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "16",
                      "benefitType": "STD",
                      "group": "4",
                      "benefitName": "Short-Term Disability",
                      "index": "16",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "No Coverage",
                      "pdf": "0",
                      "optionName": "No Coverage",
                      "optionNameLabel": "No Coverage",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "14",
                      "benefitType": "LTD",
                      "group": "4",
                      "benefitName": "Long-Term Disability",
                      "index": "17",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "Waive Coverage",
                      "pdf": "0",
                      "optionName": "Waive Coverage",
                      "optionNameLabel": "Waive Coverage",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "5",
                      "benefitType": "CRITILLNESS",
                      "group": "2",
                      "benefitName": "Critical Illness",
                      "index": "18",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "Critical Illness Insurance $5k/$5k",
                      "pdf": "0",
                      "optionName": "Critical Illness Insurance $5k/$5k",
                      "optionNameLabel": "Critical Illness Insurance $5k/$5k",
                      "coverageLevelName": "You Only",
                      "coveredCount": "1",
                      "coveredParticipant": "1",
                      "electionAmt": "$5,000",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$1.68",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "21",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "12",
                      "benefitType": "INDEMNITY",
                      "group": "2",
                      "benefitName": "Hospital Indemnity",
                      "index": "19",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "$200 Daily Benefit",
                      "pdf": "0",
                      "optionName": "$200 Daily Benefit",
                      "optionNameLabel": "$200 Daily Benefit",
                      "coverageLevelName": "You Only",
                      "coveredCount": "1",
                      "coveredParticipant": "1",
                      "electionAmt": "$200",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$9.55",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "21",
                      "eeCost": "$4.41",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$4.41",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "1",
                      "benefitType": "ACCIDENT",
                      "group": "2",
                      "benefitName": "Accident",
                      "index": "20",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "Accident Plan",
                      "pdf": "0",
                      "optionName": "Accident Plan",
                      "optionNameLabel": "Accident Plan",
                      "coverageLevelName": "You Only",
                      "coveredCount": "1",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$6.41",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "21",
                      "eeCost": "$2.96",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$2.96",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "11",
                      "benefitType": "IDTHEFT",
                      "group": "2",
                      "benefitName": "ID Theft",
                      "index": "21",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "Waive Coverage",
                      "pdf": "0",
                      "optionName": "Waive Coverage",
                      "optionNameLabel": "Waive Coverage",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    },
                    {
                      "id": "13",
                      "benefitType": "LEGAL",
                      "group": "2",
                      "benefitName": "Legal Plan",
                      "index": "22",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "optionNameRaw": "Waive Coverage",
                      "pdf": "0",
                      "optionName": "Waive Coverage",
                      "optionNameLabel": "Waive Coverage",
                      "coveredCount": "0",
                      "coveredParticipant": "1",
                      "electionAmt": "$0",
                      "electionChildAmt": "$0",
                      "premiumAmt": "$0.00",
                      "effectiveDate": "Jan 1, 2025",
                      "optionId": "0",
                      "eeCost": "$0.00",
                      "creditBadge": "0",
                      "eeCostPreTax": "$0.00",
                      "eeCostPostTax": "$0.00",
                      "erCostPreTax": "$0.00",
                      "erCostPostTax": "$0.00",
                      "erCost": "$0.00",
                      "electionSpouseAmt": "$0.00"
                    }
                  ],
                  "configBenefitCategories": [
                    {
                      "id": "1",
                      "groupId": "1",
                      "text": "Health Benefits",
                      "alertCount": "0"
                    },
                    {
                      "id": "2",
                      "groupId": "2",
                      "text": "Voluntary Benefits",
                      "alertCount": "0"
                    },
                    {
                      "id": "3",
                      "groupId": "3",
                      "text": "Spending Accounts",
                      "alertCount": "0"
                    },
                    {
                      "id": "4",
                      "groupId": "4",
                      "text": "Life & Disablity Insurance",
                      "alertCount": "0"
                    }
                  ],
                  "configBenefitInfo": [
                    {
                      "id": "1",
                      "benefitType": "MEDICAL",
                      "index": "1",
                      "summaryOrder": "1",
                      "icon": "fa-heart-pulse",
                      "groupId": "1"
                    },
                    {
                      "id": "2",
                      "benefitType": "HSA",
                      "index": "2",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "3"
                    },
                    {
                      "id": "4",
                      "benefitType": "EETOBACCO",
                      "index": "4",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "1"
                    },
                    {
                      "id": "6",
                      "benefitType": "DENTAL",
                      "index": "6",
                      "summaryOrder": "2",
                      "icon": "fa-tooth",
                      "groupId": "1"
                    },
                    {
                      "id": "7",
                      "benefitType": "VISION",
                      "index": "7",
                      "summaryOrder": "3",
                      "icon": "fa-glasses",
                      "groupId": "1"
                    },
                    {
                      "id": "8",
                      "benefitType": "HCFSA",
                      "index": "8",
                      "summaryOrder": "0",
                      "icon": "fa-sack-dollar",
                      "groupId": "3"
                    },
                    {
                      "id": "9",
                      "benefitType": "DCFSA",
                      "index": "9",
                      "summaryOrder": "0",
                      "icon": "fa-sack-dollar",
                      "groupId": "3"
                    },
                    {
                      "id": "10",
                      "benefitType": "BASICLIFE",
                      "index": "10",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "4"
                    },
                    {
                      "id": "11",
                      "benefitType": "ADD",
                      "index": "11",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "4"
                    },
                    {
                      "id": "13",
                      "benefitType": "SUPPLIFE",
                      "index": "13",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "4"
                    },
                    {
                      "id": "14",
                      "benefitType": "SUPPADD",
                      "index": "14",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "4"
                    },
                    {
                      "id": "15",
                      "benefitType": "CHILDLIFE",
                      "index": "15",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "4"
                    },
                    {
                      "id": "16",
                      "benefitType": "STD",
                      "index": "16",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "4"
                    },
                    {
                      "id": "17",
                      "benefitType": "LTD",
                      "index": "17",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "4"
                    },
                    {
                      "id": "18",
                      "benefitType": "CRITILLNESS",
                      "index": "18",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "2"
                    },
                    {
                      "id": "19",
                      "benefitType": "INDEMNITY",
                      "index": "19",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "2"
                    },
                    {
                      "id": "20",
                      "benefitType": "ACCIDENT",
                      "index": "20",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "2"
                    },
                    {
                      "id": "21",
                      "benefitType": "IDTHEFT",
                      "index": "21",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "2"
                    },
                    {
                      "id": "22",
                      "benefitType": "LEGAL",
                      "index": "22",
                      "summaryOrder": "0",
                      "icon": "fa-shield",
                      "groupId": "2"
                    }
                  ],
                  "coveredDependents": [
                    {
                      "id": "1",
                      "idDep": "49",
                      "benefitType": "DENTAL",
                      "benefitName": "Dental",
                      "nameFirst": "Batch4",
                      "nameLast": "Picture",
                      "ssn": "***-**-4738",
                      "birthDate": "Sep 9, 1999",
                      "relationship": "Child",
                      "createSort": "36412"
                    },
                    {
                      "id": "2",
                      "idDep": "49",
                      "benefitType": "MEDICAL",
                      "benefitName": "Medical",
                      "nameFirst": "Batch4",
                      "nameLast": "Picture",
                      "ssn": "***-**-4738",
                      "birthDate": "Sep 9, 1999",
                      "relationship": "Child",
                      "createSort": "36412"
                    },
                    {
                      "id": "3",
                      "idDep": "74",
                      "benefitType": "MEDICAL",
                      "benefitName": "Medical",
                      "nameFirst": "toto",
                      "nameLast": "s",
                      "ssn": "***-**-3333",
                      "birthDate": "Aug 16, 2023",
                      "relationship": "Child",
                      "createSort": "45154"
                    }
                  ],
                  "rbl-value": [
                    {
                      "id": "eventOE",
                      "value": "251721"
                    },
                    {
                      "id": "dueAmt",
                      "value": "$0.00"
                    },
                    {
                      "id": "dueDate"
                    },
                    {
                      "id": "overdueDate",
                      "value": "Dec 31, 1899"
                    },
                    {
                      "id": "invoiceDate"
                    },
                    {
                      "id": "invoiceRef"
                    },
                    {
                      "id": "pastDueAmount",
                      "value": "$0.00"
                    },
                    {
                      "id": "pastDueAmountRaw",
                      "value": "0"
                    },
                    {
                      "id": "currCharges",
                      "value": "$0.00"
                    },
                    {
                      "id": "outstandingBalance",
                      "value": "$0.00"
                    },
                    {
                      "id": "outstandingBalanceRaw",
                      "value": "0"
                    },
                    {
                      "id": "currentBalance",
                      "value": "$0.00"
                    },
                    {
                      "id": "modalTitlePayNow",
                      "value": "Common.MakePayment.ModalTitlePayNow^$0.00"
                    },
                    {
                      "id": "convenienceFeeMsg",
                      "value": "Common.MakePayment.ConvenienceFeeMsg^$10.00"
                    },
                    {
                      "id": "eeCostTotalLabel",
                      "value": "$117.81"
                    },
                    {
                      "id": "erCostTotalLabel",
                      "value": "$0.00"
                    },
                    {
                      "id": "eeCostTotal",
                      "value": "117.81"
                    },
                    {
                      "id": "erCostTotal",
                      "value": "0"
                    },
                    {
                      "id": "modalTitlePayNowCC",
                      "value": "Common.MakePayment.ModalTitlePayNowCC^$0.00"
                    },
                    {
                      "id": "showPriority",
                      "value": "0"
                    },
                    {
                      "id": "priorityEventName"
                    },
                    {
                      "id": "priorityEventType"
                    },
                    {
                      "id": "nameFirst",
                      "value": "EMPLOYEE"
                    },
                    {
                      "id": "nameLast",
                      "value": "TEST"
                    },
                    {
                      "id": "dateBirth",
                      "value": "Jul 6, 1989"
                    },
                    {
                      "id": "ssn",
                      "value": "***-**-1001"
                    },
                    {
                      "id": "ssnMask",
                      "value": "***-**-1001"
                    },
                    {
                      "id": "dateToday",
                      "value": "Feb 14, 2025"
                    },
                    {
                      "id": "address",
                      "value": "3929 SESAME ST APT 21"
                    },
                    {
                      "id": "city",
                      "value": "ROCHESTER"
                    },
                    {
                      "id": "state",
                      "value": "MN"
                    },
                    {
                      "id": "postalCode",
                      "value": "55902"
                    },
                    {
                      "id": "clientName",
                      "value": "Gold Client"
                    },
                    {
                      "id": "autoPayStatus",
                      "value": "OFF"
                    },
                    {
                      "id": "showPartialPaymentLink",
                      "value": "1"
                    },
                    {
                      "id": "showPartialWarning",
                      "value": "1"
                    },
                    {
                      "id": "partialWarning",
                      "value": "Common.MakePayment.PartialWarningPastDue"
                    },
                    {
                      "id": "showPartialWarningPastDue",
                      "value": "0"
                    },
                    {
                      "id": "partialWarningPastDue",
                      "value": "Common.MakePayment.PartialWarningPastDue"
                    },
                    {
                      "id": "paymentProcessing",
                      "value": "0"
                    },
                    {
                      "id": "paymentProcessing_off",
                      "value": "0"
                    },
                    {
                      "id": "convenienceFee",
                      "value": "$10.00"
                    },
                    {
                      "id": "convenienceFeeRaw",
                      "value": "10"
                    },
                    {
                      "id": "isOnlinePaymentAllowed",
                      "value": "1"
                    },
                    {
                      "id": "isCreditCardAllowed",
                      "value": "1"
                    },
                    {
                      "id": "showPaymentNote",
                      "value": "0"
                    },
                    {
                      "id": "showPaymentProcessingMessage",
                      "value": "0"
                    },
                    {
                      "id": "allowPay",
                      "value": "0"
                    },
                    {
                      "id": "isCheckMoneyAllowed",
                      "value": "1"
                    },
                    {
                      "id": "frequencyLabel",
                      "value": "Per-pay-period"
                    },
                    {
                      "id": "autoPayPending",
                      "value": "0"
                    },
                    {
                      "id": "paymentAmountTypeHeader",
                      "value": "Common.MakePayment.PaymentAmountTypeHeader"
                    },
                    {
                      "id": "hwSavingsShow",
                      "value": "0"
                    },
                    {
                      "id": "hwSavingsPlanYearLabel",
                      "value": "1/1/2025 - 12/31/2025"
                    },
                    {
                      "id": "hwSavingsTitle",
                      "value": "{0} Plan Year^2025"
                    },
                    {
                      "id": "dcTotalSavings",
                      "value": "$540,865.00 "
                    },
                    {
                      "id": "dcSavingsAsOf",
                      "value": "Label.AsOf^Feb 14, 2025"
                    }
                  ],
                  "eligEvents": [
                    {
                      "id": "1",
                      "key": "DIVORCE",
                      "text": "Divorce",
                      "minEventDate": "1/15/2025",
                      "maxEventDate": "2/14/2025",
                      "maxModelDate": "12/31/2025",
                      "canReport": "TRUE",
                      "canModel": "TRUE",
                      "planID": "LE,21"
                    },
                    {
                      "id": "2",
                      "key": "EEGAINCOV",
                      "text": "Gain Other Coverage",
                      "minEventDate": "1/15/2025",
                      "maxEventDate": "2/14/2025",
                      "maxModelDate": "12/31/2025",
                      "canReport": "TRUE",
                      "canModel": "TRUE",
                      "planID": "LE,21"
                    },
                    {
                      "id": "3",
                      "key": "EELOSECOV",
                      "text": "Lose Prior Coverage",
                      "minEventDate": "1/15/2025",
                      "maxEventDate": "2/14/2025",
                      "maxModelDate": "12/31/2025",
                      "canReport": "TRUE",
                      "canModel": "TRUE",
                      "planID": "LE,21"
                    },
                    {
                      "id": "4",
                      "key": "HSACHG",
                      "text": "HSA Changes & Enrollment",
                      "minEventDate": "1/15/2025",
                      "maxEventDate": "2/14/2025",
                      "maxModelDate": "12/31/2025",
                      "canReport": "TRUE",
                      "canModel": "TRUE",
                      "planID": "LE,21"
                    },
                    {
                      "id": "5",
                      "key": "MARRIAGE",
                      "text": "Marriage",
                      "minEventDate": "1/15/2025",
                      "maxEventDate": "2/14/2025",
                      "maxModelDate": "12/31/2025",
                      "canReport": "TRUE",
                      "canModel": "TRUE",
                      "planID": "LE,21"
                    }
                  ],
                  "rbl-listcontrol": [
                    {
                      "id": "iLifeEvent",
                      "table": "eligEvents"
                    },
                    {
                      "id": "iState",
                      "table": "state"
                    },
                    {
                      "id": "iPaymentAmountType",
                      "table": "paymentAmountType"
                    }
                  ],
                  "openEvents": [
                    {
                      "id": "2",
                      "index": "OPENENR",
                      "description": "Annual Enrollment",
                      "eventDate": "2024-01-01",
                      "eventStatus": "COMPLETED",
                      "eventStatusMsg": "COMPLETED",
                      "period": "ENROLLMENT",
                      "isCompleted": "TRUE",
                      "isPriority": "FALSE",
                      "planID": "LE,21",
                      "eventID": "251721",
                      "eventCutoffDate": "2025-02-15T04:59:58Z",
                      "eventCutoffDateFormat": "Common.Home.RBLHome.OpenEvents.EventCutoffDateFormat^Feb 14, 2025^11:59 PM",
                      "eventStatusDate": "2024-08-06T15:47:14.496Z",
                      "canDelete": "FALSE",
                      "canMakeChanges": "TRUE"
                    },
                    {
                      "id": "1",
                      "index": "BIRTH",
                      "description": "Birth/Adoption",
                      "eventDate": "2025-01-15",
                      "eventStatus": "COMPLETED",
                      "eventStatusMsg": "COMPLETED",
                      "period": "COMPLETED",
                      "isCompleted": "TRUE",
                      "isPriority": "FALSE",
                      "planID": "LE,21",
                      "eventID": "316164",
                      "eventCutoffDate": "2025-02-15T04:59:59Z",
                      "eventCutoffDateFormat": "Common.Home.RBLHome.OpenEvents.EventCutoffDateFormat^Feb 14, 2025^11:59 PM",
                      "eventStatusDate": "2025-02-01T17:13:44.186Z",
                      "canDelete": "FALSE",
                      "canMakeChanges": "TRUE"
                    }
                  ],
                  "helpfulInfo": [
                    {
                      "id": "1",
                      "index": "MEDICAL-25",
                      "benefitType": "MEDICAL",
                      "optionID": "25",
                      "displaySeq": "0",
                      "providerURL": "http://www.conduent.com",
                      "optionName": "Aetna HSA 2000 Ded",
                      "providerPhone": "1-800-516-2898",
                      "summaryLink_off": "/client_docs/079/21/2018/0125.pdf",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "2",
                      "index": "MEDICAL-41",
                      "benefitType": "MEDICAL",
                      "optionID": "41",
                      "displaySeq": "0",
                      "providerURL": "http://www.conduent.com",
                      "optionName": "HMSA",
                      "providerPhone": "1-800-776-4672",
                      "summaryLink_off": "/client_docs/079/21/2018/0111.pdf",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "3",
                      "index": "DENTAL-01",
                      "benefitType": "DENTAL",
                      "optionID": "01",
                      "displaySeq": "0",
                      "providerURL": "http://www.conduent.com",
                      "optionName": "Aetna Dental Plan",
                      "providerPhone": "1-800-516-2898",
                      "summaryLink_off": "/client_docs/079/21/2018/0201.pdf",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "4",
                      "index": "DENTAL-02",
                      "benefitType": "DENTAL",
                      "optionID": "02",
                      "displaySeq": "0",
                      "providerURL": "http://www.conduent.com",
                      "optionName": "Cigna Dental Plan",
                      "providerPhone": "1-800-441-2668",
                      "summaryLink_off": "/client_docs/079/21/2018/0202.pdf",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "5",
                      "index": "BASICLIFE-01",
                      "benefitType": "BASICLIFE",
                      "optionID": "01",
                      "displaySeq": "0",
                      "providerURL": "http://www.conduent.com",
                      "optionName": "1x Pay",
                      "providerPhone": "1-800-355-BLUE (2583)",
                      "summaryLink_off": "/client_docs/079/21/2018/0101.pdf",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "6",
                      "index": "Puerto Rico-",
                      "benefitType": "Puerto Rico",
                      "optionID": "0",
                      "displaySeq": "0",
                      "providerURL": "www.hacienda.pr.gov/",
                      "optionName": "Departamento De Hacienda",
                      "providerPhone": "1-787-620-2323",
                      "summaryLink_off": "0",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "7",
                      "index": "EBSA-",
                      "benefitType": "EBSA",
                      "optionID": "0",
                      "displaySeq": "0",
                      "providerURL": "www.dol.gov/ebsa",
                      "optionName": "Employee Benefits Security Administration",
                      "providerPhone": "1-866-444-3272",
                      "summaryLink_off": "0",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "8",
                      "index": "PBGC-",
                      "benefitType": "PBGC",
                      "optionID": "0",
                      "displaySeq": "0",
                      "providerURL": "www.pbgc.gov",
                      "optionName": "Pension Benefit Guaranty Corporation",
                      "providerPhone": "1-800-400-7242",
                      "summaryLink_off": "0",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "9",
                      "index": "IRS-",
                      "benefitType": "IRS",
                      "optionID": "0",
                      "displaySeq": "0",
                      "providerURL": "www.irs.gov",
                      "optionName": "Internal Revenue Service",
                      "providerPhone": "1-800-829-1040",
                      "summaryLink_off": "0",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "10",
                      "index": "Medicare-",
                      "benefitType": "Medicare",
                      "optionID": "0",
                      "displaySeq": "0",
                      "providerURL": "www.medicare.gov",
                      "optionName": "Medicare",
                      "providerPhone": "1-800-633-4227",
                      "summaryLink_off": "0",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    },
                    {
                      "id": "11",
                      "index": "SSA-",
                      "benefitType": "SSA",
                      "optionID": "0",
                      "displaySeq": "0",
                      "providerURL": "www.ssa.gov",
                      "optionName": "Social Security Administration",
                      "providerPhone": "1-800-772-1213",
                      "summaryLink_off": "0",
                      "summaryLink": "/client_docs/test.pdf",
                      "summaryType": "0"
                    }
                  ],
                  "state": [
                    {
                      "id": "1",
                      "key": "AL",
                      "text": "Alabama",
                      "visible": "1"
                    },
                    {
                      "id": "2",
                      "key": "AK",
                      "text": "Alaska",
                      "visible": "1"
                    },
                    {
                      "id": "3",
                      "key": "AZ",
                      "text": "Arizona",
                      "visible": "1"
                    },
                    {
                      "id": "4",
                      "key": "AR",
                      "text": "Arkansas",
                      "visible": "1"
                    },
                    {
                      "id": "5",
                      "key": "CA",
                      "text": "California",
                      "visible": "1"
                    },
                    {
                      "id": "6",
                      "key": "CO",
                      "text": "Colorado",
                      "visible": "1"
                    },
                    {
                      "id": "7",
                      "key": "CT",
                      "text": "Connecticut",
                      "visible": "1"
                    },
                    {
                      "id": "8",
                      "key": "DE",
                      "text": "Delaware",
                      "visible": "1"
                    },
                    {
                      "id": "9",
                      "key": "DC",
                      "text": "District Of Columbia",
                      "visible": "1"
                    },
                    {
                      "id": "10",
                      "key": "FL",
                      "text": "Florida",
                      "visible": "1"
                    },
                    {
                      "id": "11",
                      "key": "GA",
                      "text": "Georgia",
                      "visible": "1"
                    },
                    {
                      "id": "12",
                      "key": "HI",
                      "text": "Hawaii",
                      "visible": "1"
                    },
                    {
                      "id": "13",
                      "key": "ID",
                      "text": "Idaho",
                      "visible": "1"
                    },
                    {
                      "id": "14",
                      "key": "IL",
                      "text": "Illinois",
                      "visible": "1"
                    },
                    {
                      "id": "15",
                      "key": "IN",
                      "text": "Indiana",
                      "visible": "1"
                    },
                    {
                      "id": "16",
                      "key": "IA",
                      "text": "Iowa",
                      "visible": "1"
                    },
                    {
                      "id": "17",
                      "key": "KS",
                      "text": "Kansas",
                      "visible": "1"
                    },
                    {
                      "id": "18",
                      "key": "KY",
                      "text": "Kentucky",
                      "visible": "1"
                    },
                    {
                      "id": "19",
                      "key": "LA",
                      "text": "Louisiana",
                      "visible": "1"
                    },
                    {
                      "id": "20",
                      "key": "ME",
                      "text": "Maine",
                      "visible": "1"
                    },
                    {
                      "id": "21",
                      "key": "MD",
                      "text": "Maryland",
                      "visible": "1"
                    },
                    {
                      "id": "22",
                      "key": "MA",
                      "text": "Massachusetts",
                      "visible": "1"
                    },
                    {
                      "id": "23",
                      "key": "MI",
                      "text": "Michigan",
                      "visible": "1"
                    },
                    {
                      "id": "24",
                      "key": "MN",
                      "text": "Minnesota",
                      "visible": "1"
                    },
                    {
                      "id": "25",
                      "key": "MS",
                      "text": "Mississippi",
                      "visible": "1"
                    },
                    {
                      "id": "26",
                      "key": "MO",
                      "text": "Missouri",
                      "visible": "1"
                    },
                    {
                      "id": "27",
                      "key": "MT",
                      "text": "Montana",
                      "visible": "1"
                    },
                    {
                      "id": "28",
                      "key": "NE",
                      "text": "Nebraska",
                      "visible": "1"
                    },
                    {
                      "id": "29",
                      "key": "NV",
                      "text": "Nevada",
                      "visible": "1"
                    },
                    {
                      "id": "30",
                      "key": "NH",
                      "text": "New Hampshire",
                      "visible": "1"
                    },
                    {
                      "id": "31",
                      "key": "NJ",
                      "text": "New Jersey",
                      "visible": "1"
                    },
                    {
                      "id": "32",
                      "key": "NM",
                      "text": "New Mexico",
                      "visible": "1"
                    },
                    {
                      "id": "33",
                      "key": "NY",
                      "text": "New York",
                      "visible": "1"
                    },
                    {
                      "id": "34",
                      "key": "NC",
                      "text": "North Carolina",
                      "visible": "1"
                    },
                    {
                      "id": "35",
                      "key": "ND",
                      "text": "North Dakota",
                      "visible": "1"
                    },
                    {
                      "id": "36",
                      "key": "OH",
                      "text": "Ohio",
                      "visible": "1"
                    },
                    {
                      "id": "37",
                      "key": "OK",
                      "text": "Oklahoma",
                      "visible": "1"
                    },
                    {
                      "id": "38",
                      "key": "OR",
                      "text": "Oregon",
                      "visible": "1"
                    },
                    {
                      "id": "39",
                      "key": "PA",
                      "text": "Pennsylvania",
                      "visible": "1"
                    },
                    {
                      "id": "40",
                      "key": "RI",
                      "text": "Rhode Island",
                      "visible": "1"
                    },
                    {
                      "id": "41",
                      "key": "SC",
                      "text": "South Carolina",
                      "visible": "1"
                    },
                    {
                      "id": "42",
                      "key": "SD",
                      "text": "South Dakota",
                      "visible": "1"
                    },
                    {
                      "id": "43",
                      "key": "TN",
                      "text": "Tennessee",
                      "visible": "1"
                    },
                    {
                      "id": "44",
                      "key": "TX",
                      "text": "Texas",
                      "visible": "1"
                    },
                    {
                      "id": "45",
                      "key": "UT",
                      "text": "Utah",
                      "visible": "1"
                    },
                    {
                      "id": "46",
                      "key": "VT",
                      "text": "Vermont",
                      "visible": "1"
                    },
                    {
                      "id": "47",
                      "key": "VA",
                      "text": "Virginia",
                      "visible": "1"
                    },
                    {
                      "id": "48",
                      "key": "WA",
                      "text": "Washington",
                      "visible": "1"
                    },
                    {
                      "id": "49",
                      "key": "WV",
                      "text": "West Virginia",
                      "visible": "1"
                    },
                    {
                      "id": "50",
                      "key": "WI",
                      "text": "Wisconsin",
                      "visible": "1"
                    },
                    {
                      "id": "51",
                      "key": "WY",
                      "text": "Wyoming",
                      "visible": "1"
                    }
                  ],
                  "savannaTokens": [
                    {
                      "id": "aiEnabled",
                      "value": "1"
                    },
                    {
                      "id": "callCenterAddress",
                      "value": "GOLD Service Center<br/>P.O. Box 5261<br/>Cherry Hill, NJ 08034-5261"
                    },
                    {
                      "id": "callCenterAvailability",
                      "value": "Monday through Friday from 8:00 a.m. to 7:00 p.m., Eastern Time (excluding holidays)"
                    },
                    {
                      "id": "callCenterName",
                      "value": "GOLD Service Center"
                    },
                    {
                      "id": "callCenterPhone",
                      "value": "1-800-243-1234"
                    },
                    {
                      "id": "callCenterRep",
                      "value": "Service Center Representative"
                    },
                    {
                      "id": "changeAddress",
                      "value": "contact Human Resources at 1-800-555-5555"
                    },
                    {
                      "id": "changeEmail",
                      "value": "use the Employer Self Service site"
                    },
                    {
                      "id": "changePhone",
                      "value": "use the Employer Self Service site"
                    },
                    {
                      "id": "clientName",
                      "value": "Gold Client"
                    },
                    {
                      "id": "configHwShowErCostShareModal",
                      "value": "TRUE"
                    },
                    {
                      "id": "configLandingViewId_off",
                      "value": "Common.Home"
                    },
                    {
                      "id": "configMailRolConfirmation",
                      "value": "FALSE"
                    },
                    {
                      "id": "configShowElectionCutoffDate",
                      "value": "TRUE"
                    },
                    {
                      "id": "configShowMaritalStatus",
                      "value": "TRUE"
                    },
                    {
                      "id": "copyright",
                      "value": "© 2025 Conduent Business Services, LLC All rights reserved."
                    },
                    {
                      "id": "domainDb",
                      "value": "0"
                    },
                    {
                      "id": "domainHw",
                      "value": "1"
                    },
                    {
                      "id": "lockBoxName",
                      "value": "Gold Client Lock Box"
                    },
                    {
                      "id": "mailPaymentCityStateZip",
                      "value": "Florham Park, NJ 07932"
                    },
                    {
                      "id": "mailPaymentStreetAddress",
                      "value": "P.O. Box 99999"
                    },
                    {
                      "id": "resourcesContactListFormat",
                      "value": "simple"
                    },
                    {
                      "id": "siteKey",
                      "value": "GOLD"
                    },
                    {
                      "id": "siteName",
                      "value": "Gold Services Portal"
                    },
                    {
                      "id": "surveyLink",
                      "value": "https://forms.gle/vtDCyRA55b6KesNB6"
                    }
                  ],
                  "otherCompanyBenefits": [
                    {
                      "id": "1",
                      "benefitName": "Commuter Benefits",
                      "icon": "fa-car-side",
                      "vendorName": "Edenred",
                      "vendorPhone": "0",
                      "vendorWebsite": "https://commuterbenefits.com/",
                      "pdfLink": "/client_docs/079/21/2018/0101.pdf"
                    },
                    {
                      "id": "2",
                      "benefitName": "Home & Auto",
                      "icon": "fa-house",
                      "vendorName": "Metlife",
                      "vendorPhone": "555-555-5555",
                      "vendorWebsite": "0",
                      "pdfLink": "/client_docs/079/21/2018/0101.pdf"
                    },
                    {
                      "id": "3",
                      "benefitName": "Pet Insurance",
                      "icon": "fa-dog",
                      "vendorName": "Metlife",
                      "vendorPhone": "555-555-5555",
                      "vendorWebsite": "https://www.metlife.com/insurance/",
                      "pdfLink": "0"
                    },
                    {
                      "id": "4",
                      "benefitName": "Purchase Program",
                      "icon": "fa-money-check-dollar",
                      "vendorName": "Purchasing Power",
                      "vendorPhone": "0",
                      "vendorWebsite": "https://www.purchasingpower.com/",
                      "pdfLink": "0"
                    },
                    {
                      "id": "5",
                      "benefitName": "Employee Discounts",
                      "icon": "fa-badge-percent",
                      "vendorName": "BenefitHub",
                      "vendorPhone": "555-555-5555",
                      "vendorWebsite": "https://www.benefithub.com/",
                      "pdfLink": "/client_docs/079/21/2018/0101.pdf"
                    },
                    {
                      "id": "6",
                      "benefitName": "Caregiver Assistance",
                      "icon": "fa-hands-holding-child",
                      "vendorName": "Ianacare",
                      "vendorPhone": "555-555-5555",
                      "vendorWebsite": "https://ianacare.com/",
                      "pdfLink": "/client_docs/079/21/2018/0101.pdf"
                    },
                    {
                      "id": "7",
                      "benefitName": "Student Loan Assistance",
                      "icon": "fa-hand-holding-dollar",
                      "vendorName": "Fiducious",
                      "vendorPhone": "555-555-5555",
                      "vendorWebsite": "https://getfiducius.com/",
                      "pdfLink": "/client_docs/079/21/2018/0101.pdf"
                    }
                  ],
                  "paymentAmountType": [
                    {
                      "id": "1",
                      "key": "outstandingBalance",
                      "text": "Common.MakePayment.OutstandingBalance^$0.00",
                      "visible": "1"
                    },
                    {
                      "id": "3",
                      "key": "otherAmount",
                      "text": "Other amount:",
                      "visible": "1"
                    }
                  ],
                  "rbl-input": [
                    {
                      "id": "iStatementDate",
                      "type": "select",
                      "label": "",
                      "help-title": "",
                      "help": "",
                      "skip-calc": "",
                      "display": "",
                      "value": "#VALUE!",
                      "list": "statementDate"
                    },
                    {
                      "id": "iEnableAutoPay",
                      "value": "0"
                    },
                    {
                      "id": "iPaymentAmount",
                      "value": "1.00"
                    }
                  ],
                  "savingsAccountSummary": [
                    {
                      "id": "1",
                      "benefitType": "DC",
                      "planName": "401(k) Plan",
                      "balance": "$341,550.00 "
                    },
                    {
                      "id": "2",
                      "benefitType": "NQ",
                      "planName": "Non-Qualified Plan",
                      "balance": "$119,256.00 "
                    },
                    {
                      "id": "3",
                      "benefitType": "HSA",
                      "planName": "Health Savings Account",
                      "balance": "$80,059.00 "
                    }
                  ]
                }
              ],
              "Specifications": [
                {
                  "@Name": "RBLInput",
                  "@CalcEngine": "Conduent_Nexgen_Home_SE.xlsm",
                  "@Version": "1.1461",
                  "GlobalTables": "",
                  "DataTables": "addresses,benefitContactLogo,configBenefitCategories,configBenefitInfo,configEventInfo,coveredDependentsCoverages,dbSavannaContentQuery,dependentAddresses,dependents,eftAccounts,electedCoverages,eligEvents,eligGroups,eoiType,helpfulInfo2,hwBenefitParameters,invoiceDates,invoiceDetailsQuery,keyValue,libraryData,openEvents,otherCompanyBenefits,paymentDetails,pendingInfo,planInfo,reimbursementAccountInfo,resourceCategories,transactionHistory,userEligibility"
                }
              ]
            }
          }
        },
        "Exception": null,
        "Diagnostics": null
      }
    }
  ]
}
""" ) );
	}
}
