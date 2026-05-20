##  Setup & Usage

### 1. Data Ingestion and Indexing

To crawl the website and build the vector store, use the provided Jupyter Notebook:

* Open `LanceDB_Index_Builder.ipynb`.


* Run the cells to crawl `abdiadama.com`.


* The script will process the data, index it, and create a `table` folder containing the LanceDB vector data.



### 2. Install Dependencies

Install the required Python packages using pip:

```bash
pip install -r requirements.txt

```

### 3. Run the Backend

Start the FastAPI server using Uvicorn:

```bash
python -m uvicorn app:app --reload

```

The backend will be available at `http://127.0.0.1:8000`.

---

## Architecture

* **Crawler:** Firecrawl


* **Vector Database:** LanceDB


* **LLM:** Mistral AI


* **Framework:** FastAPI / Uvicorn



```

```