# BB-RFQ-011 — Instrumentation and Control

## Request for Quotation — **BUDGETARY ENQUIRY**

| | |
| --- | --- |
| To | *(supplier name and address)* |
| Attention | |
| Date | |
| Our reference | BB-RFQ-011 Rev. 0 |
| Enquiry status | **Budgetary — for budget pricing and technical guidance** |
| Quotation required by | |

Dear Sir or Madam,

### Subject: Process instrumentation and control system — BlueBloom Spirulina Production Facility, Hyderabad Region

## 1. Instrument schedule

| Location | Measurement | Type | Quantity |
| --- | --- | --- | --- |
| Production ponds | pH | In-line, continuous | 4 |
| Production ponds | Temperature | In-line, continuous | 4 |
| Production ponds | Level | Indication | 4 |
| Nursery ponds | pH and temperature | In-line | 2 each |
| Harvest line | Flow | Totalised | 1 |
| Harvest line | Pressure | Indication | 1 |
| CO₂ system | Flow | Totalised | 1 |
| CO₂ storage | Contents | Indication with low alarm | 1 |
| Nutrient dosing | Flow or batch volume | Totalised | 1 |
| Make-up water | Flow | Totalised | 1 |
| Blowdown | Flow | Totalised | 1 |
| Dryer | Inlet air temperature | Continuous, **recorded** | 1 |
| Dryer | **Product temperature** | Continuous, **recorded** | 1 |
| Wet cake holding | Temperature | Indication | 1 |

## 2. pH measurement — the difficult duty

pH governs both the culture and the CO₂ injection system, and this is a hard
service for a probe:

| Condition | Value |
| --- | --- |
| Operating pH | 9.5 – 10.5 |
| Alkalinity | 8 – 16 g/L as sodium bicarbonate |
| Salinity | Up to 30 g/L total dissolved solids |
| Fouling | Continuous biomass contact |
| Temperature | Up to 40 °C culture, 45 °C ambient |
| Location | Outdoor, fully exposed |

**Probes will drift and foul in this service.** We intend to calibrate weekly.
Please propose a probe suited to high-alkalinity, high-fouling, outdoor duty and
state the calibration interval you would expect, and the electrode life.

Please quote spare probes as a consumable item with an expected annual usage.

## 3. Control system

| Function | Control mode required |
| --- | --- |
| Pond circulation | Continuous, manual start, **alarmed on failure** |
| pH and CO₂ injection | **Automatic, closed loop on pond pH** |
| Nutrient dosing | Manual or semi-automatic, verified by laboratory analysis |
| Make-up water | Automatic on pond level, with high-level cut-off |
| Harvesting | Manual initiation, automatic sequence |
| Dewatering | Semi-automatic |
| Drying | **Automatic on product temperature, with recording** |
| Milling and packing | Manual initiation |

We are deliberately **not** automating nutrient dosing. The governing measurement
is a laboratory analysis rather than a live signal, and automatic dosing against
an unverified assumption compounds an error over days before anyone notices.

## 4. Interlocks and alarms

| Interlock | Requirement |
| --- | --- |
| **Nutrient dosing inhibited when circulation is not running** | Safety and process — concentrated reagent dosed into a static pond creates a zone of extreme pH |
| Paddle wheel failure | Alarm |
| pH outside 9.5 – 10.5 | Alarm |
| Culture temperature above 40 °C | Alarm |
| CO₂ storage low | Alarm |
| Dryer product temperature above 60 °C | Alarm and control action |

## 5. Panel

| Requirement | Detail |
| --- | --- |
| **Spare I/O** | **20 % minimum**, for expansion to five acres |
| Enclosure | Suitable for the environment; state IP rating |
| Recording | Dryer time, temperature and batch recorded per cycle and retrievable |
| Data | Culture pH, temperature and level logged and retrievable |
| Power | UPS-backed |

Recorded drying data forms part of our batch records and must be retrievable and
exportable, not merely displayed.

## 6. What to include in your quotation

In addition to **BB-RFQ-000, Instructions to Suppliers**, attached:

- instruments proposed per § 1, with make and model;
- pH probe recommendation for the service at § 2, with expected electrode life;
- annual consumable cost for probes and buffers;
- control panel and I/O count, showing the 20 % spare;
- calibration equipment and procedure;
- data logging, retention and export capability;
- commissioning and operator training, with duration;
- annual maintenance contract, priced separately.

Yours faithfully,

<br><br>

**For BlueBloom Spirulina Private Limited**

*(name and designation)*

---
*Attachment: BB-RFQ-000, Instructions to Suppliers*
