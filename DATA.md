# Data and provenance

## Source inventory

| Workspace material | Role |
| --- | --- |
| Research article and supplementary PDF | Methods, interpretation, and the mitigation thresholds used by the study. |
| `capsule/code/` and capsule environment | Upstream training, projections, and manuscript plotting scripts. |
| `capsule/data/` | Observations from Comal Springs, J17, and NOAA, plus downscaled CMIP5 and CMIP6 inputs. |
| `capsule/results/` | Published prediction and projection workbooks consumed by the dashboard. |
| Original dashboard HTML, template, and JSON | Existing presentation and chart data used to assemble this repository. |
| ZIP exports | Copies of source and presentation materials. |

The repository tracks the dashboard code and derived JSON snapshot. The research capsule, raw workbooks, PDFs, and ZIP exports stay with their upstream sources. Use the paper’s data and code availability sections to locate the full research materials. [Study and source data](https://www.nature.com/articles/s41893-024-01477-6) · [Code Ocean capsule](https://doi.org/10.24433/CO.1405116.v1)

## Inputs used by the dashboard build

The extraction script reads 78 workbooks from the capsule root.

```text
capsule/
├── data/
│   └── Observed/
│       ├── Comal_Spring_until_6_15_2023.xlsx
│       └── J17_Index_well_until_6_15_2023.xlsx
└── results/
    ├── Results CAI Predictions/    # 4 workbooks, Test and Pred for both sites
    └── Results Projections/        # 72 workbooks, 2 sites × 9 models × 2 scenarios × 2 mitigation states
```

## How the dashboard data are derived

| JSON field | Method |
| --- | --- |
| `historical` | Weekly observed and modeled minima from the Test workbooks (1990–2005) and Pred workbooks (2006–2022). Includes R², RMSE, medians, and minima. |
| `decadal` | Projected weekly minima, with negative values clipped to zero, grouped by site, model, emissions scenario, and mitigation state. Eight bins start at 2023, 2033, …, 2093. The final bin uses the available record. Each summary has quartiles, Tukey whisker endpoints, a sample count, and the share of weekly values at or below zero. |
| `envelope` | Weekly mean, minimum, and maximum across the models in each generation, then averaged within each calendar year from 2023 to 2099. The band represents the spread of model outputs. |
| `extremes` | Record minima and the number of nonpositive-flow days in the supplied observed workbooks. |
| `stages` | Five study-period Critical Period Management thresholds and cutback percentages from Supplementary Table S2. |

Comal discharge is shown in cubic metres per second. J17 elevation is shown in metres above mean sea level. The model generations use RCP 4.5 and RCP 8.5 for CMIP5 and SSP 2-4.5 and SSP 5-8.5 for CMIP6. Capsule suffixes `M` and `NM` identify projections with and without mitigation, respectively.

These values describe the research dataset and its scenarios. Observations end with the supplied records, and the future series are scenario-based projections. The original modeling code and training environment are available through the [research capsule](https://doi.org/10.24433/CO.1405116.v1).
