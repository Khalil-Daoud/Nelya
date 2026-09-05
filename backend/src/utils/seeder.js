const Product = require('../models/Product');
const Category = require('../models/Category');

const seedData = async () => {
  try {
    console.log('🌱 Cleaning and Seeding data...');

    // Clear existing data
    await Product.destroy({ where: {}, truncate: { cascade: true } });
    await Category.destroy({ where: {}, truncate: { cascade: true } });

    const cat1 = await Category.create({ name: 'Soins Visage', description: 'Crèmes, sérums et masques.' });
    const cat2 = await Category.create({ name: 'Parfums', description: 'Fragrances de luxe.' });
    const cat3 = await Category.create({ name: 'Maquillage', description: 'Beauté du regard et du teint.' });

    await Product.bulkCreate([
      {
        name: 'Huile de Souchet',
        description: 'L’huile de souchet aide à ralentir la repousse des poils tout en nourrissant la peau en douceur. Un soin naturel pour une peau lisse et douce. \nزيت السعد يساعد على تأخير نمو الشعر مع تغذية البشرة بلطف. علاج طبيعي لبشرة ناعمة وحريرية',
        price: 25.00,
        stock: 50,
        category: 'Soins Naturels',
        image_url: '/img/huile.jpg'
      },
      {
        name: 'Déodorant Éclaircissant',
        description: 'Découvrez notre nouveau déodorant éclaircissant, enrichi en niacinamide et zinc PCA, pour des aisselles fraîches, nettes et visiblement unifiées jour après jour. Adieu les taches sous les bras ! Notre déodorant purifie et protège, tout au long de la journée ✨',
        price: 18.00,
        stock: 100,
        category: 'Hygiène',
        image_url: '/img/deo.jpg'
      },
      {
        name: 'Pack Promo Fête des Mères',
        description: 'À l\'occasion des fêtes des mères, profitez de nos offres exceptionnelles ! Plusieurs promo vous attendent🌸🎁',
        price: 45.00,
        stock: 30,
        category: 'Promotions',
        image_url: '/img/promo.jpg'
      }
    ]);

    console.log('✅ Seed complete!');
  } catch (error) {
    console.error('❌ Seed error:', error);
  }
};

module.exports = seedData;
