# Edwards Aquifer Counterfactual Dashboard

An interactive companion to the study of groundwater mitigation in the Edwards Aquifer’s San Antonio Pool. Explore observed and counterfactual Comal Springs flow and J17 groundwater elevation, compare projections with and without mitigation for nine climate models, and view the CMIP5 and CMIP6 ensemble ranges. The dashboard summarizes saved study outputs. Model training and simulation take place in the upstream research capsule. [Published study](https://www.nature.com/articles/s41893-024-01477-6) · [Code Ocean capsule](https://doi.org/10.24433/CO.1405116.v1)

## Open the dashboard

Open [docs/index.html](docs/index.html) in a browser. All chart data, JavaScript, and CSS are embedded in the page. Google Fonts is optional and the page uses fallback fonts when offline.

To serve it locally, run this command from the repository root and visit [the local dashboard](http://localhost:8000).

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

## Rebuild the page

Python 3.14 is used for development and CI. Building the page from the tracked JSON uses the standard library.

```sh
python build_page.py
python build_page.py --check
```

Edit `dashboard_template.html` for dashboard changes. Commit the regenerated `docs/index.html` alongside any template or JSON changes. The GitHub Actions check verifies that the generated page matches both inputs.

## Regenerate the dataset

Install the extraction dependencies in a virtual environment using Python 3.14.

```sh
python -m venv .venv
```

Activate the environment with `.venv\Scripts\Activate.ps1` in PowerShell or `source .venv/bin/activate` in Bash on macOS or Linux. Install the dependencies.

```sh
python -m pip install -r requirements.txt
```

Use an existing capsule export with the directory layout shown in [DATA.md](DATA.md). For this workspace's adjacent capsule:

```sh
python build_data.py --capsule-dir ../capsule
python build_page.py
python build_page.py --check
```

For a fresh checkout, export the published capsule and point `--capsule-dir` at its extracted root. The included `bash fetch_capsule.sh` can also populate the default `capsule/` path when the upstream artifact URLs are reachable. It requires Bash, curl and mktemp. With inputs under `capsule/`, run `python build_data.py` without arguments. Use `--output regenerated.json` to produce a comparison snapshot without overwriting the tracked data.

## Repository layout

| Path | Purpose |
| --- | --- |
| `build_data.py` | Extracts dashboard metrics and chart series from the capsule workbooks. |
| `dashboard_data.json` | Tracked snapshot of the derived chart data. |
| `dashboard_template.html` | Dashboard markup, styles, and SVG chart logic. |
| `build_page.py` | Embeds the snapshot and checks the generated page. |
| `docs/index.html` | Standalone, generated site entry point. |
| `fetch_capsule.sh` | Optional downloader for the workbook inputs. |
| [DATA.md](DATA.md) | Source inventory, workbook layout, transformations, and scope. |
| [CITATION.cff](CITATION.cff) | Citation metadata for the study. |

## Publish on GitHub Pages

Create an empty GitHub repository and push the local `main` branch. In **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/docs`. GitHub displays the site URL after deployment. [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Citation and reuse

Sharma, C., Başağaoğlu, H., Yoosefdoost, I. et al. *Efficacy of mitigation strategies for aquifer sustainability under climate change*. Nature Sustainability 8, 44–53 (2025). [Article DOI](https://doi.org/10.1038/s41893-024-01477-6) · [Code and data DOI](https://doi.org/10.24433/CO.1405116.v1)

The workspace’s MIT notice appears inside the upstream capsule’s code directory. This dashboard repository has no separately specified license. Refer to each upstream source for its reuse terms.
