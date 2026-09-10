import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Search, Edit, Trash2, Save, Percent, Info, ArrowRight, Lightbulb } from 'lucide-react'
import { Button, Input, Select, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'
import { brandService } from '@/services/brandService'
import { unitService } from '@/services/unitService'
import { taxService } from '@/services/taxService'
import { getStoredProducts, addStoredProduct, updateStoredProduct, deleteStoredProduct, SharedProduct } from '@/data/sharedData'

interface Product {
  id: string
  sku: string
  name: string
  category: string
  brand: string
  unit: string
  purchasePrice: number
  sellingPrice: number
  taxRate: number
  taxName: string
  stock: number
  status: 'ACTIVE' | 'INACTIVE'
}

export function ProductsPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [units, setUnits] = useState<string[]>([])
  const [taxSlabs, setTaxSlabs] = useState<{ name: string; rate: number }[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const mapProductData = (p: any): Product => {
    const catName = typeof p.category === 'string' && p.category ? p.category : (p.category_id?.name || (typeof p.category_id === 'string' ? p.category_id : ''))
    const brandName = typeof p.brand === 'string' && p.brand ? p.brand : (p.brand_id?.name || (typeof p.brand_id === 'string' ? p.brand_id : ''))
    const unitName = typeof p.unit === 'string' && p.unit ? p.unit : (p.unit_id?.name || p.unit_id?.code || (typeof p.unit_id === 'string' ? p.unit_id : ''))
    
    const costPrice = p.cost_price ?? p.purchasePrice ?? p.price ?? 0
    const sellPrice = p.price ?? p.sellingPrice ?? 0
    const taxRateVal = p.tax_rate ?? p.taxRate ?? 0

    return {
      id: String(p._id || p.id),
      sku: p.sku || '',
      name: p.name || '',
      category: catName,
      brand: brandName,
      unit: unitName,
      purchasePrice: Number(costPrice),
      sellingPrice: Number(sellPrice),
      taxRate: Number(taxRateVal),
      taxName: p.taxName || (taxRateVal !== undefined && taxRateVal !== null ? `GST ${taxRateVal}%` : ''),
      stock: Number(p.stock ?? 0),
      status: p.status === 'INACTIVE' || p.visibility === false ? 'INACTIVE' : 'ACTIVE'
    }
  }

  useEffect(() => {
    const loadCatalogAndDropdowns = async () => {
      let apiProducts: Product[] = []
      try {
        const res = await productService.fetchProducts()
        const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
        if (rawList.length > 0) {
          apiProducts = rawList.map(mapProductData)
        }
      } catch (err) {
        console.warn('Could not fetch backend products:', err)
      }

      const stored = getStoredProducts().map(mapProductData)
      const seenIds = new Set(apiProducts.map(p => p.id))
      const combinedStored = stored.filter(s => !seenIds.has(s.id))
      const allProds = [...apiProducts, ...combinedStored]

      setProducts(allProds)

      let fetchedCats: string[] = []
      let fetchedBrands: string[] = []
      let fetchedUnits: string[] = []
      let fetchedTaxes: { name: string; rate: number }[] = []

      try {
        const [catData, brandData, unitData, taxData] = await Promise.allSettled([
          categoryService.fetchCategories(),
          brandService.fetchBrands(),
          unitService.fetchUnits(),
          taxService.fetchTaxes()
        ])

        if (catData.status === 'fulfilled' && Array.isArray(catData.value)) {
          fetchedCats = catData.value.map((c: any) => c.name).filter(Boolean)
        }
        if (brandData.status === 'fulfilled' && Array.isArray(brandData.value)) {
          fetchedBrands = brandData.value.map((b: any) => b.name).filter(Boolean)
        }
        if (unitData.status === 'fulfilled' && Array.isArray(unitData.value)) {
          fetchedUnits = unitData.value.map((u: any) => u.name || u.code).filter(Boolean)
        }
        if (taxData.status === 'fulfilled' && Array.isArray(taxData.value)) {
          fetchedTaxes = taxData.value.map((t: any) => ({
            name: t.name || `GST ${t.percentage}%`,
            rate: Number(t.percentage)
          }))
        }
      } catch (err) {
        console.warn('Could not fetch dropdown options:', err)
      }

      const productCats = allProds.map(p => p.category).filter(Boolean)
      const productBrands = allProds.map(p => p.brand).filter(Boolean)
      const productUnits = allProds.map(p => p.unit).filter(Boolean)

      const mergedCats = Array.from(new Set([...fetchedCats, ...productCats]))
      const mergedBrands = Array.from(new Set([...fetchedBrands, ...productBrands]))
      const mergedUnits = Array.from(new Set([...fetchedUnits, ...productUnits]))

      const taxRateMap = new Map<number, string>()
      fetchedTaxes.forEach(t => taxRateMap.set(t.rate, t.name))
      allProds.forEach(p => {
        if (p.taxRate !== undefined && p.taxRate !== null && !taxRateMap.has(Number(p.taxRate))) {
          taxRateMap.set(Number(p.taxRate), p.taxName || `GST ${p.taxRate}%`)
        }
      })
      const mergedTaxes = Array.from(taxRateMap.entries()).map(([rate, name]) => ({ name, rate }))

      setCategories(mergedCats)
      setBrands(mergedBrands)
      setUnits(mergedUnits)
      setTaxSlabs(mergedTaxes)
    }

    loadCatalogAndDropdowns()
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [selectedProd, setSelectedProd] = useState<Product | null>(null)

  // Quick-Add Modals State & Validation Errors
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [catError, setCatError] = useState('')

  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [brandError, setBrandError] = useState('')

  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [unitError, setUnitError] = useState('')

  const [isAddTaxOpen, setIsAddTaxOpen] = useState(false)
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxRate, setNewTaxRate] = useState('')
  const [taxNameError, setTaxNameError] = useState('')
  const [taxRateError, setTaxRateError] = useState('')

  const handleQuickAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setCatError('')
    const catName = newCatName.trim()
    if (!catName) {
      setCatError('Category name is required')
      return
    }
    if (categories.some(c => c.toLowerCase() === catName.toLowerCase())) {
      setCatError(`Category "${catName}" already exists!`)
      showToast(`Category "${catName}" already exists!`, 'error')
      return
    }
    try {
      await categoryService.createCategory({ name: catName, description: newCatDesc })
    } catch (err) {
      console.warn('Quick add category backend notice:', err)
    }
    setCategories(prev => [...prev, catName])
    setFormData(prev => ({ ...prev, category: catName }))
    setErrors(prev => ({ ...prev, category: undefined }))
    setNewCatName('')
    setNewCatDesc('')
    setCatError('')
    setIsAddCategoryOpen(false)
    showToast(`Category "${catName}" created and auto-selected!`, 'success')
  }

  const handleQuickAddBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    setBrandError('')
    const brandName = newBrandName.trim()
    if (!brandName) {
      setBrandError('Brand name is required')
      return
    }
    if (brands.some(b => b.toLowerCase() === brandName.toLowerCase())) {
      setBrandError(`Brand "${brandName}" already exists!`)
      showToast(`Brand "${brandName}" already exists!`, 'error')
      return
    }
    try {
      await brandService.createBrand({ name: brandName })
    } catch (err) {
      console.warn('Quick add brand backend notice:', err)
    }
    setBrands(prev => [...prev, brandName])
    setFormData(prev => ({ ...prev, brand: brandName }))
    setErrors(prev => ({ ...prev, brand: undefined }))
    setNewBrandName('')
    setBrandError('')
    setIsAddBrandOpen(false)
    showToast(`Brand "${brandName}" created and auto-selected!`, 'success')
  }

  const handleQuickAddUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUnitError('')
    const uName = newUnitName.trim()
    if (!uName) {
      setUnitError('Unit name is required')
      return
    }
    if (units.some(u => u.toLowerCase() === uName.toLowerCase())) {
      setUnitError(`Unit "${uName}" already exists!`)
      showToast(`Unit "${uName}" already exists!`, 'error')
      return
    }
    try {
      await unitService.createUnit({ name: uName, code: uName })
    } catch (err) {
      console.warn('Quick add unit backend notice:', err)
    }
    setUnits(prev => [...prev, uName])
    setFormData(prev => ({ ...prev, unit: uName }))
    setErrors(prev => ({ ...prev, unit: undefined }))
    setNewUnitName('')
    setUnitError('')
    setIsAddUnitOpen(false)
    showToast(`Unit "${uName}" created and auto-selected!`, 'success')
  }

  const handleQuickAddTax = async (e: React.FormEvent) => {
    e.preventDefault()
    setTaxNameError('')
    setTaxRateError('')
    const tName = newTaxName.trim()
    const tRate = Number(newTaxRate)
    let hasErr = false
    if (!tName) {
      setTaxNameError('Tax slab name is required')
      hasErr = true
    }
    if (newTaxRate === '' || isNaN(tRate) || tRate < 0) {
      setTaxRateError('Valid positive tax rate % is required')
      hasErr = true
    }
    if (hasErr) return

    if (taxSlabs.some(t => t.name.toLowerCase() === tName.toLowerCase())) {
      setTaxNameError(`Tax slab "${tName}" already exists!`)
      showToast(`Tax slab "${tName}" already exists!`, 'error')
      return
    }
    if (taxSlabs.some(t => t.rate === tRate)) {
      setTaxRateError(`A tax slab with ${tRate}% rate already exists!`)
      showToast(`Tax rate ${tRate}% already exists!`, 'error')
      return
    }

    try {
      await taxService.createTax({ name: tName, percentage: tRate })
    } catch (err) {
      console.warn('Quick add tax backend notice:', err)
    }
    setTaxSlabs(prev => [...prev, { name: tName, rate: tRate }])
    setFormData(prev => ({ ...prev, taxRate: tRate, taxName: tName }))
    setErrors(prev => ({ ...prev, taxRate: undefined }))
    setNewTaxName('')
    setNewTaxRate('')
    setTaxNameError('')
    setTaxRateError('')
    setIsAddTaxOpen(false)
    showToast(`Tax rate "${tName}" created and auto-selected!`, 'success')
  }

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    brand: '',
    unit: '',
    purchasePrice: '' as any,
    sellingPrice: '' as any,
    taxRate: '' as any,
    taxName: '',
    stock: '' as any,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const productSchema: ValidationSchema<typeof formData> = {
    sku: { required: 'SKU code is required' },
    name: { required: 'Product name is required' },
    category: { required: 'Category is required' },
    brand: { required: 'Brand is required' },
    unit: { required: 'Packaging unit is required' },
    purchasePrice: { required: 'Purchase cost is required', positive: 'Purchase cost must be greater than 0' },
    sellingPrice: { required: 'Selling price is required', positive: 'Selling price must be greater than 0' },
    taxRate: { required: 'GST tax rate is required' }
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, productSchema)
    setErrors(newErrors)
    return isValid
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleToggleStatus = async (prod: Product) => {
    const newStatus = prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await productService.updateProduct(prod.id, { status: newStatus })
      showToast(`Product "${prod.name}" status set to ${newStatus}`, 'success')
    } catch (err: any) {
      console.warn('Backend update product status warning:', err)
    }
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, status: newStatus } : p))
  }

  const handleOpenAdd = () => {
    setFormData({
      sku: '',
      name: '',
      category: '',
      brand: '',
      unit: '',
      purchasePrice: '',
      sellingPrice: '',
      taxRate: '',
      taxName: '',
      stock: '',
      status: 'ACTIVE'
    })
    setErrors({})
    setIsAddOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const trimmedSku = formData.sku.trim()
    const trimmedName = formData.name.trim()

    if (products.some(p => p.sku.toLowerCase() === trimmedSku.toLowerCase())) {
      setErrors(prev => ({ ...prev, sku: `SKU code "${trimmedSku}" is already registered!` }))
      showToast(`SKU code "${trimmedSku}" already exists!`, 'error')
      return
    }

    if (products.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors(prev => ({ ...prev, name: `Product name "${trimmedName}" already exists in catalog!` }))
      showToast(`Product name "${trimmedName}" already exists!`, 'error')
      return
    }

    let createdId = `prod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
    try {
      const res = await productService.createProduct({
        name: trimmedName,
        sku: trimmedSku,
        category: formData.category,
        brand: formData.brand,
        unit: formData.unit,
        price: Number(formData.sellingPrice),
        cost_price: Number(formData.purchasePrice),
        tax_rate: Number(formData.taxRate),
        stock: Number(formData.stock) || 0,
        status: formData.status
      })
      if (res && (res._id || res.id)) {
        createdId = String(res._id || res.id)
      }
    } catch (err) {
      console.warn('Backend create product warning:', err)
    }

    const newProd: Product = {
      id: createdId,
      sku: trimmedSku,
      name: trimmedName,
      category: formData.category,
      brand: formData.brand,
      unit: formData.unit,
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
      taxRate: Number(formData.taxRate),
      taxName: formData.taxName || `GST ${formData.taxRate}%`,
      stock: Number(formData.stock) || 0,
      status: formData.status
    }

    addStoredProduct(newProd)
    setProducts(prev => [newProd, ...prev])
    setIsAddOpen(false)
    showToast(`Product "${trimmedName}" added successfully!`, 'success')
  }

  const handleOpenEdit = (prod: Product) => {
    if (prod.category && !categories.includes(prod.category)) {
      setCategories(prev => [...prev, prod.category])
    }
    if (prod.brand && !brands.includes(prod.brand)) {
      setBrands(prev => [...prev, prod.brand])
    }
    if (prod.unit && !units.includes(prod.unit)) {
      setUnits(prev => [...prev, prod.unit])
    }
    if (prod.taxRate !== undefined && prod.taxRate !== null && !taxSlabs.some(t => Number(t.rate) === Number(prod.taxRate))) {
      setTaxSlabs(prev => [...prev, { name: prod.taxName || `GST ${prod.taxRate}%`, rate: Number(prod.taxRate) }])
    }

    setSelectedProd(prod)
    setFormData({
      sku: prod.sku || '',
      name: prod.name || '',
      category: prod.category || '',
      brand: prod.brand || '',
      unit: prod.unit || '',
      purchasePrice: prod.purchasePrice ?? '',
      sellingPrice: prod.sellingPrice ?? '',
      taxRate: prod.taxRate ?? '',
      taxName: prod.taxName || (prod.taxRate !== undefined ? `GST ${prod.taxRate}%` : ''),
      stock: prod.stock ?? '',
      status: prod.status || 'ACTIVE'
    })
    setErrors({})
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProd) return
    if (!validate()) return

    const trimmedSku = formData.sku.trim()
    const trimmedName = formData.name.trim()

    if (products.some(p => p.id !== selectedProd.id && p.sku.toLowerCase() === trimmedSku.toLowerCase())) {
      setErrors(prev => ({ ...prev, sku: `SKU code "${trimmedSku}" is already in use by another product!` }))
      showToast(`SKU code "${trimmedSku}" already in use!`, 'error')
      return
    }

    if (products.some(p => p.id !== selectedProd.id && p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors(prev => ({ ...prev, name: `Product name "${trimmedName}" is already in use by another product!` }))
      showToast(`Product name "${trimmedName}" already exists!`, 'error')
      return
    }

    try {
      await productService.updateProduct(selectedProd.id, {
        name: trimmedName,
        sku: trimmedSku,
        category: formData.category,
        brand: formData.brand,
        unit: formData.unit,
        price: Number(formData.sellingPrice),
        cost_price: Number(formData.purchasePrice),
        tax_rate: Number(formData.taxRate),
        stock: Number(formData.stock) || 0,
        status: formData.status
      })
    } catch (err) {
      console.warn('Backend update product warning:', err)
    }

    const updatedProd: Product = {
      ...selectedProd,
      sku: trimmedSku,
      name: trimmedName,
      category: formData.category,
      brand: formData.brand,
      unit: formData.unit,
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
      taxRate: Number(formData.taxRate),
      taxName: formData.taxName || `GST ${formData.taxRate}%`,
      stock: Number(formData.stock) || 0,
      status: formData.status
    }

    updateStoredProduct(updatedProd)
    setProducts(prev => prev.map(p => p.id === selectedProd.id ? updatedProd : p))

    setIsEditOpen(false)
    showToast(`Product "${trimmedName}" updated successfully!`, 'success')
  }

  const openDelete = (prod: Product) => {
    setSelectedProd(prod)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedProd) return
    try {
      await productService.deleteProduct(selectedProd.id)
    } catch (err) {
      console.warn('Backend delete product warning:', err)
    }

    deleteStoredProduct(selectedProd.id)
    setProducts(prev => prev.filter(p => p.id !== selectedProd.id))
    showToast(`Product "${selectedProd.name}" removed from catalog.`, 'info')
    setIsDeleteOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/20 border border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Product Catalog</h1>
            <button
              onClick={() => setIsGuideOpen(true)}
              title="How to Add Products - Setup Guide"
              className="p-1.5 px-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:text-orbit-primary-light hover:bg-orbit-primary/10 border border-slate-200 dark:border-orbit-border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm ml-1"
            >
              <Info className="w-4 h-4 text-orbit-primary-light" />
              <span>How to Add Products Guide</span>
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage pharmaceutical products, pricing, GST tax rates, and stock limits</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 font-medium shadow-lg shadow-orbit-primary/30">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Modern Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search products by SKU, name, or category..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Full Width Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl overflow-hidden shadow-sm w-full transition-all duration-200">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full relative">
          <table className="w-full text-left text-sm sm:text-base text-slate-800 dark:text-slate-200 min-w-[850px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm text-slate-700 dark:text-slate-300 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">SKU / Product Name</th>
                <th className="px-6 py-4">Category & Brand</th>
                <th className="px-6 py-4">Cost / Selling</th>
                <th className="px-6 py-4">GST Tax Rate</th>
                <th className="px-6 py-4">Total Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-border">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No Products Found"
                  description="Your product catalog is empty or no products match your search query."
                  actionLabel="Add Product"
                  onAction={handleOpenAdd}
                  colSpan={7}
                />
              ) : (
                paginated.map(prod => (
                  <tr key={prod.id} className="hover:bg-orbit-primary/50/[0.04] dark:hover:bg-orbit-primary/10 transition-colors">
                    <td className="px-6 py-4.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{prod.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20/80 dark:bg-orbit-primary/15 dark:text-orbit-primary-light dark:border-orbit-primary/30">{prod.sku}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 dark:bg-orbit-surface2 dark:text-slate-300 dark:border-orbit-border">{prod.unit}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <p className="text-slate-900 dark:text-slate-100 font-bold">{prod.category}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{prod.brand}</p>
                    </td>
                    <td className="px-6 py-4.5">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cost: ₹{prod.purchasePrice.toFixed(2)}</p>
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-0.5">Sell: ₹{prod.sellingPrice.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20/80 dark:bg-orbit-primary/15 dark:text-orbit-primary-light dark:border-orbit-primary/30">
                        <Percent className="w-3.5 h-3.5" /> {prod.taxName}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{prod.stock} units</span>
                    </td>
                    <td className="px-6 py-4.5">
                      <ToggleSwitch
                        checked={prod.status === 'ACTIVE'}
                        onChange={() => handleToggleStatus(prod)}
                        label={prod.status === 'ACTIVE' ? 'Active' : 'Blocked'}
                        activeColor="emerald"
                      />
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          title="Edit Product"
                          className="p-2 text-slate-500 hover:text-orbit-primary-light dark:text-slate-400 dark:hover:text-orbit-primary-light hover:bg-orbit-primary/10 rounded-xl transition-colors"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => openDelete(prod)}
                          title="Delete Product"
                          className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Step Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="3xl" title="Add New Product Master" subtitle="Enter product details, pricing, stock unit, classification, and GST tax rate">
        <form noValidate onSubmit={handleCreate} className="space-y-5">
          {/* Basic Identification */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3 pb-1 border-b border-orbit-border">1. Basic Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Input
                label="SKU Code"
                value={formData.sku}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, sku: e.target.value }))
                  setErrors(prev => ({ ...prev, sku: undefined }))
                }}
                error={errors.sku}
                placeholder="e.g. PREG-KIT-001"
                required
              />
              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                  setErrors(prev => ({ ...prev, name: undefined }))
                }}
                error={errors.name}
                placeholder="e.g. Pregnancy Test Kit / Rapid Detection Kit"
                required
                className="sm:col-span-2"
              />
            </div>
          </div>

          {/* Classification & Unit */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3 pb-1 border-b border-orbit-border">2. Classification & Packaging</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Select
                label="Category"
                placeholder="Select Category"
                value={formData.category}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, category: e.target.value }))
                  setErrors(prev => ({ ...prev, category: undefined }))
                }}
                error={errors.category}
                required
                options={categories.map(c => ({ label: c, value: c }))}
                onQuickAdd={() => setIsAddCategoryOpen(true)}
                quickAddLabel="+ Add Category"
              />
              <Select
                label="Brand / Manufacturer"
                placeholder="Select Brand"
                value={formData.brand}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, brand: e.target.value }))
                  setErrors(prev => ({ ...prev, brand: undefined }))
                }}
                error={errors.brand}
                required
                options={brands.map(b => ({ label: b, value: b }))}
                onQuickAdd={() => setIsAddBrandOpen(true)}
                quickAddLabel="+ Add Brand"
              />
              <Select
                label="Packaging Unit"
                placeholder="Select Packaging Unit"
                value={formData.unit}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, unit: e.target.value }))
                  setErrors(prev => ({ ...prev, unit: undefined }))
                }}
                error={errors.unit}
                required
                options={units.map(u => ({ label: u, value: u }))}
                onQuickAdd={() => setIsAddUnitOpen(true)}
                quickAddLabel="+ Add Unit"
              />
            </div>
          </div>

          {/* Pricing & Tax */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3 pb-1 border-b border-orbit-border">3. Pricing &amp; GST Tax Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Input
                label="Purchase Cost (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.purchasePrice}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, purchasePrice: e.target.value === '' ? '' : Number(e.target.value) }))
                  setErrors(prev => ({ ...prev, purchasePrice: undefined }))
                }}
                error={errors.purchasePrice}
                required
              />
              <Input
                label="Selling Price (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, sellingPrice: e.target.value === '' ? '' : Number(e.target.value) }))
                  setErrors(prev => ({ ...prev, sellingPrice: undefined }))
                }}
                error={errors.sellingPrice}
                required
              />
              <Select
                label="GST Tax Rate"
                placeholder="Select GST Tax Rate"
                value={formData.taxRate}
                onChange={(e) => {
                  const val = e.target.value
                  const rate = val === '' ? '' : Number(val)
                  const slab = taxSlabs.find(s => s.rate === rate)
                  setFormData(prev => ({ ...prev, taxRate: rate, taxName: slab?.name || (rate !== '' ? `GST ${rate}%` : '') }))
                  setErrors(prev => ({ ...prev, taxRate: undefined }))
                }}
                error={errors.taxRate}
                required
                className="font-bold text-orbit-primary-light dark:text-orbit-primary-light"
                options={taxSlabs.map(s => ({ label: s.name, value: s.rate }))}
                onQuickAdd={() => setIsAddTaxOpen(true)}
                quickAddLabel="+ Add Tax"
              />
            </div>
          </div>

          <div className="pt-2">
            <ToggleSwitch
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              label={formData.status === 'ACTIVE' ? 'Active Product' : 'Blocked / Inactive'}
              description="Inactive products will be hidden from customer ordering and POS sales"
              activeColor="emerald"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 px-6 py-2 font-semibold text-sm"><Save className="w-4 h-4" /> Save Product Master</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="3xl" title="Edit Product Master" subtitle={`Updating product details for ${selectedProd?.name}`}>
        <form noValidate onSubmit={handleUpdate} className="space-y-5">
          {/* Basic Identification */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3 pb-1 border-b border-orbit-border">1. Basic Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Input
                label="SKU Code"
                value={formData.sku}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, sku: e.target.value }))
                  setErrors(prev => ({ ...prev, sku: undefined }))
                }}
                error={errors.sku}
                required
              />
              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                  setErrors(prev => ({ ...prev, name: undefined }))
                }}
                error={errors.name}
                required
                className="sm:col-span-2"
              />
            </div>
          </div>

          {/* Classification */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3 pb-1 border-b border-orbit-border">2. Classification & Packaging</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Select
                label="Category"
                placeholder="Select Category"
                value={formData.category}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, category: e.target.value }))
                  setErrors(prev => ({ ...prev, category: undefined }))
                }}
                error={errors.category}
                required
                options={categories.map(c => ({ label: c, value: c }))}
                onQuickAdd={() => setIsAddCategoryOpen(true)}
                quickAddLabel="+ Add Category"
              />
              <Select
                label="Brand"
                placeholder="Select Brand"
                value={formData.brand}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, brand: e.target.value }))
                  setErrors(prev => ({ ...prev, brand: undefined }))
                }}
                error={errors.brand}
                required
                options={brands.map(b => ({ label: b, value: b }))}
                onQuickAdd={() => setIsAddBrandOpen(true)}
                quickAddLabel="+ Add Brand"
              />
              <Select
                label="Packaging Unit"
                placeholder="Select Packaging Unit"
                value={formData.unit}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, unit: e.target.value }))
                  setErrors(prev => ({ ...prev, unit: undefined }))
                }}
                error={errors.unit}
                required
                options={units.map(u => ({ label: u, value: u }))}
                onQuickAdd={() => setIsAddUnitOpen(true)}
                quickAddLabel="+ Add Unit"
              />
            </div>
          </div>

          {/* Pricing & Tax */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3 pb-1 border-b border-orbit-border">3. Pricing &amp; GST Tax Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Input
                label="Purchase Cost (₹)"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, purchasePrice: e.target.value === '' ? '' : Number(e.target.value) }))
                  setErrors(prev => ({ ...prev, purchasePrice: undefined }))
                }}
                error={errors.purchasePrice}
                required
              />
              <Input
                label="Selling Price (₹)"
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, sellingPrice: e.target.value === '' ? '' : Number(e.target.value) }))
                  setErrors(prev => ({ ...prev, sellingPrice: undefined }))
                }}
                error={errors.sellingPrice}
                required
              />
              <Select
                label="GST Tax Rate"
                placeholder="Select GST Tax Rate"
                value={formData.taxRate}
                onChange={(e) => {
                  const val = e.target.value
                  const rate = val === '' ? '' : Number(val)
                  const slab = taxSlabs.find(s => s.rate === rate)
                  setFormData(prev => ({ ...prev, taxRate: rate, taxName: slab?.name || (rate !== '' ? `GST ${rate}%` : '') }))
                  setErrors(prev => ({ ...prev, taxRate: undefined }))
                }}
                error={errors.taxRate}
                required
                className="font-bold text-orbit-primary-light dark:text-orbit-primary-light"
                options={taxSlabs.map(s => ({ label: s.name, value: s.rate }))}
                onQuickAdd={() => setIsAddTaxOpen(true)}
                quickAddLabel="+ Add Tax"
              />
            </div>
          </div>

          <div className="pt-2">
            <ToggleSwitch
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              label={formData.status === 'ACTIVE' ? 'Active Product' : 'Blocked / Inactive'}
              description="Inactive products will be hidden from customer ordering and POS sales"
              activeColor="emerald"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 px-6 py-2 font-semibold text-sm"><Save className="w-4 h-4" /> Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Product Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Delete Product Master" subtitle="Confirm product removal">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to remove <strong className="text-slate-900 dark:text-slate-100">{selectedProd?.name}</strong> (<span className="font-mono font-bold text-orbit-primary-light">{selectedProd?.sku}</span>)?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2"><Trash2 className="w-4 h-4" /> Delete Product</Button>
          </div>
        </div>
      </Modal>

      {/* Product Setup & Prerequisite Guide Modal */}
      <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} size="2xl" title="How to Add Products - Step-by-Step Setup Guide" subtitle="Follow this recommended order so your dropdowns (Categories, Brands, Units, Taxes) have data ready">
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-orbit-primary/10 border border-orbit-primary/20 rounded-xl flex items-start gap-3 text-slate-800 dark:text-slate-200">
            <Lightbulb className="w-5 h-5 text-orbit-primary-light flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Prerequisite Setup Order</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Before adding a product, create your Tax Rates, Categories, Brands, and Units first. That way, when you open the "Add Product" form, all dropdown options are ready to select!
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 1: Configure GST Tax Rates</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create GST tax slabs (e.g. 0%, 5%, 12%, 18%, 28%) for price calculations.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/catalog/taxes') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Taxes <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 2: Add Product Categories</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create categories (e.g. Pregnancy Kits, Pain Relief, Antibiotics, Supplements).</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/catalog/categories') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Categories <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 3: Add Brands &amp; Manufacturers</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add pharmaceutical manufacturers (e.g. Livwee Health, Abbott, Pfizer, Sun Pharma).</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/catalog/brands') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Brands <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">4</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 4: Add Packaging Units</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Define stock measurement units (e.g. Box, Strip, Bottle, Vial, Pcs).</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/catalog/units') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Units <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 5 */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">5</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 5: Create Product Master</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click "+ Add Product" to fill SKU Code, Name, select created Category/Brand/Unit/Tax, and enter Purchase Cost &amp; Selling Price.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => { setIsGuideOpen(false); handleOpenAdd() }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 flex-shrink-0 font-semibold">
                Add Product Now <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 6 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">6</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 6: Assign Batches &amp; Stock Qty</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assign batch numbers, expiry dates, and warehouse quantities for FEFO billing.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/inventory/batches') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Batches <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button variant="outline" onClick={() => setIsGuideOpen(false)}>Close Guide</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Category Modal */}
      <Modal isOpen={isAddCategoryOpen} onClose={() => { setIsAddCategoryOpen(false); setCatError('') }} size="md" title="Quick Add Category" subtitle="Create a new product category on the fly">
        <form onSubmit={handleQuickAddCategory} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Antibiotics, Pain Relief, Surgical"
            value={newCatName}
            onChange={(e) => { setNewCatName(e.target.value); setCatError('') }}
            error={catError}
            required
          />
          <Input
            label="Description (Optional)"
            placeholder="e.g. Pharmaceutical prescription items"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => { setIsAddCategoryOpen(false); setCatError('') }}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white font-semibold">Add &amp; Select Category</Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Brand Modal */}
      <Modal isOpen={isAddBrandOpen} onClose={() => { setIsAddBrandOpen(false); setBrandError('') }} size="md" title="Quick Add Brand / Manufacturer" subtitle="Create a new brand or pharma manufacturer">
        <form onSubmit={handleQuickAddBrand} className="space-y-4">
          <Input
            label="Brand Name"
            placeholder="e.g. Cipla, Sun Pharma, Livwee"
            value={newBrandName}
            onChange={(e) => { setNewBrandName(e.target.value); setBrandError('') }}
            error={brandError}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => { setIsAddBrandOpen(false); setBrandError('') }}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white font-semibold">Add &amp; Select Brand</Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Unit Modal */}
      <Modal isOpen={isAddUnitOpen} onClose={() => { setIsAddUnitOpen(false); setUnitError('') }} size="md" title="Quick Add Packaging Unit" subtitle="Create a new packaging unit of measure">
        <form onSubmit={handleQuickAddUnit} className="space-y-4">
          <Input
            label="Unit Name / Code"
            placeholder="e.g. Strip, Box, Bottle, Ampoule"
            value={newUnitName}
            onChange={(e) => { setNewUnitName(e.target.value); setUnitError('') }}
            error={unitError}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => { setIsAddUnitOpen(false); setUnitError('') }}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white font-semibold">Add &amp; Select Unit</Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Tax Modal */}
      <Modal isOpen={isAddTaxOpen} onClose={() => { setIsAddTaxOpen(false); setTaxNameError(''); setTaxRateError('') }} size="md" title="Quick Add GST Tax Rate" subtitle="Create a new GST tax slab rate">
        <form onSubmit={handleQuickAddTax} className="space-y-4">
          <Input
            label="Tax Slab Name"
            placeholder="e.g. GST 12% Standard, GST 18%"
            value={newTaxName}
            onChange={(e) => { setNewTaxName(e.target.value); setTaxNameError('') }}
            error={taxNameError}
            required
          />
          <Input
            label="Tax Rate Percentage (%)"
            type="number"
            step="0.01"
            placeholder="e.g. 12"
            value={newTaxRate}
            onChange={(e) => { setNewTaxRate(e.target.value); setTaxRateError('') }}
            error={taxRateError}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => { setIsAddTaxOpen(false); setTaxNameError(''); setTaxRateError('') }}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white font-semibold">Add &amp; Select Tax</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
